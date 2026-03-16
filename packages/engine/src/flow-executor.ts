import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FlowData,
  FlowNode,
  ConversationContext,
  BotConfig,
  ContactData,
  ProcessMessageResult,
  ActionResult,
} from "./types";
import { AIResponder } from "./ai-responder";
import { ActionHandler } from "./action-handler";
import { ContextManager } from "./context-manager";
import { IntentRouter } from "./intent-router";

export class FlowExecutor {
  private aiResponder: AIResponder;
  private actionHandler: ActionHandler;
  private contextManager: ContextManager;
  private intentRouter: IntentRouter;

  constructor(
    private supabase: SupabaseClient,
    anthropicApiKey: string
  ) {
    this.aiResponder = new AIResponder(anthropicApiKey, supabase);
    this.actionHandler = new ActionHandler(supabase);
    this.contextManager = new ContextManager(supabase);
    this.intentRouter = new IntentRouter(supabase);
  }

  async processMessage(
    botConfig: BotConfig,
    conversationId: string,
    contactId: string,
    message: string,
    channel: "whatsapp" | "sms" | "instagram"
  ): Promise<ProcessMessageResult> {
    // Load context
    const context = await this.contextManager.getContext(conversationId);
    this.contextManager.addUserMessage(context, message);

    // Load contact
    const { data: contactData } = await this.supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    const contact: ContactData = contactData
      ? {
          id: contactData.id,
          name: contactData.name,
          phone: contactData.phone,
          email: contactData.email,
          tags: contactData.tags || [],
          custom_fields: (contactData.custom_fields as Record<string, unknown>) || {},
        }
      : {
          id: contactId,
          name: null,
          phone: null,
          email: null,
          tags: [],
          custom_fields: {},
        };

    // Check if we have a delay pending
    if (context.delay_until) {
      const delayUntil = new Date(context.delay_until);
      if (delayUntil > new Date()) {
        // Still in delay, just save the message and don't process
        await this.contextManager.updateContext(conversationId, context);
        return { responses: [], actions: [], context };
      }
      // Delay has passed, clear it
      delete context.delay_until;
    }

    // Route message to appropriate flow
    const match = await this.intentRouter.routeMessage(
      botConfig.id,
      message,
      context
    );

    if (!match) {
      // No flow matched - use AI fallback
      const aiResponse = await this.aiResponder.generateResponse(
        botConfig,
        context,
        contact,
        channel
      );

      this.contextManager.addAssistantMessage(context, aiResponse);
      await this.contextManager.updateContext(conversationId, context);

      return {
        responses: [aiResponse],
        actions: [],
        context,
      };
    }

    // Update context with current flow
    context.current_flow_id = match.flowId;

    // If we're continuing from an existing node, use that; otherwise start from trigger
    const startNodeId = context.current_node_id || match.nodeId;

    // Execute the flow from the start node
    const result = await this.executeFromNode(
      match.flow,
      startNodeId,
      botConfig,
      context,
      contact,
      conversationId,
      channel,
      message
    );

    // Save updated context
    await this.contextManager.updateContext(conversationId, result.context);

    return result;
  }

  private async executeFromNode(
    flow: FlowData,
    nodeId: string,
    botConfig: BotConfig,
    context: ConversationContext,
    contact: ContactData,
    conversationId: string,
    channel: string,
    userMessage: string
  ): Promise<ProcessMessageResult> {
    const responses: string[] = [];
    const actions: ActionResult[] = [];
    let currentNodeId = nodeId;
    let shouldClose = false;
    let iterations = 0;
    const maxIterations = 20; // Safety limit

    while (currentNodeId && iterations < maxIterations) {
      iterations++;

      const node = flow.nodes.find((n) => n.id === currentNodeId);
      if (!node) break;

      const config = (node.data.config as Record<string, unknown>) || {};

      switch (node.type) {
        case "trigger": {
          // Trigger node - just move to next node
          const nextNodes = this.intentRouter.getNextNodes(flow, currentNodeId);
          currentNodeId = nextNodes[0]?.id || "";
          break;
        }

        case "message": {
          // Send a static message
          const messageText = (config.messageText as string) || "";
          const interpolated = this.contextManager.interpolate(
            messageText,
            context,
            contact,
            userMessage
          );
          if (interpolated) {
            responses.push(interpolated);
            this.contextManager.addAssistantMessage(context, interpolated);
          }
          const nextNodes = this.intentRouter.getNextNodes(flow, currentNodeId);
          currentNodeId = nextNodes[0]?.id || "";
          break;
        }

        case "ai_response": {
          // Generate AI response
          const systemPrompt = config.systemPrompt as string | undefined;
          const temperature = config.temperature as number | undefined;
          const aiResponse = await this.aiResponder.generateResponse(
            botConfig,
            context,
            contact,
            channel,
            systemPrompt || undefined,
            temperature
          );
          responses.push(aiResponse);
          this.contextManager.addAssistantMessage(context, aiResponse);

          const nextNodes = this.intentRouter.getNextNodes(flow, currentNodeId);
          // After AI response, wait for user input (park at next node)
          if (nextNodes.length > 0) {
            context.current_node_id = nextNodes[0].id;
            context.waiting_for_input = true;
          } else {
            context.current_node_id = undefined;
            context.current_flow_id = undefined;
          }
          currentNodeId = ""; // Stop execution, wait for next message
          break;
        }

        case "condition": {
          // Evaluate condition
          const conditionType = (config.conditionType as string) || "contains";
          const conditionValue = (config.value as string) || "";
          const conditionMet = this.evaluateCondition(
            conditionType,
            conditionValue,
            userMessage,
            context,
            contact
          );

          const handle = conditionMet ? "yes" : "no";
          const nextNodes = this.intentRouter.getNextNodes(
            flow,
            currentNodeId,
            handle
          );
          currentNodeId = nextNodes[0]?.id || "";
          break;
        }

        case "action": {
          const actionType = (config.actionType as string) || "";
          const actionValue = (config.actionValue as string) || "";
          const interpolatedValue = this.contextManager.interpolate(
            actionValue,
            context,
            contact,
            userMessage
          );

          const result = await this.actionHandler.executeAction(
            actionType,
            interpolatedValue,
            context,
            contact,
            conversationId,
            botConfig.id
          );
          actions.push(result);

          if (actionType === "close_conversation") {
            shouldClose = true;
          }

          // If it's a handoff, stop flow execution
          if (actionType === "handoff") {
            context.current_flow_id = undefined;
            context.current_node_id = undefined;
            currentNodeId = "";
            break;
          }

          const nextNodes = this.intentRouter.getNextNodes(flow, currentNodeId);
          currentNodeId = nextNodes[0]?.id || "";
          break;
        }

        case "delay": {
          const duration = (config.duration as number) || 5;
          const unit = (config.unit as string) || "minutes";

          const delayMs = this.getDelayMs(duration, unit);
          const delayUntil = new Date(Date.now() + delayMs);
          context.delay_until = delayUntil.toISOString();

          // Park at the next node after delay
          const nextNodes = this.intentRouter.getNextNodes(flow, currentNodeId);
          context.current_node_id = nextNodes[0]?.id || undefined;
          currentNodeId = ""; // Stop execution
          break;
        }

        case "template": {
          const templateName = (config.templateName as string) || "";
          const variablesStr = (config.variables as string) || "[]";
          let variables: string[] = [];
          try {
            variables = JSON.parse(variablesStr);
          } catch {
            variables = [];
          }

          // Interpolate template variables
          const interpolatedVars = variables.map((v) =>
            this.contextManager.interpolate(v, context, contact, userMessage)
          );

          // The actual sending is handled by the channel adapter
          responses.push(
            JSON.stringify({
              type: "template",
              template_name: templateName,
              variables: interpolatedVars,
            })
          );

          const nextNodes = this.intentRouter.getNextNodes(flow, currentNodeId);
          currentNodeId = nextNodes[0]?.id || "";
          break;
        }

        case "http_request": {
          const method = (config.method as string) || "GET";
          const url = this.contextManager.interpolate(
            (config.url as string) || "",
            context,
            contact,
            userMessage
          );

          let headers: Record<string, string> = {};
          try {
            headers = JSON.parse((config.headers as string) || "{}");
          } catch {
            headers = {};
          }

          let body: string | undefined;
          if (config.body) {
            body = this.contextManager.interpolate(
              config.body as string,
              context,
              contact,
              userMessage
            );
          }

          try {
            const response = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json", ...headers },
              body: method !== "GET" ? body : undefined,
            });
            const responseData = await response.json().catch(() => null);

            // Store response in context variables
            this.contextManager.setVariable(
              context,
              "http_response",
              responseData
            );
            this.contextManager.setVariable(
              context,
              "http_status",
              response.status
            );
          } catch (error) {
            this.contextManager.setVariable(context, "http_error", String(error));
          }

          const nextNodes = this.intentRouter.getNextNodes(flow, currentNodeId);
          currentNodeId = nextNodes[0]?.id || "";
          break;
        }

        default:
          // Unknown node type, skip
          const nextNodes = this.intentRouter.getNextNodes(flow, currentNodeId);
          currentNodeId = nextNodes[0]?.id || "";
          break;
      }
    }

    return {
      responses,
      actions,
      context,
      should_close: shouldClose,
    };
  }

  private evaluateCondition(
    type: string,
    value: string,
    message: string,
    context: ConversationContext,
    contact: ContactData
  ): boolean {
    const lowerMessage = message.toLowerCase().trim();
    const lowerValue = value.toLowerCase().trim();

    switch (type) {
      case "contains":
        return lowerMessage.includes(lowerValue);

      case "equals":
        return lowerMessage === lowerValue;

      case "regex": {
        try {
          const regex = new RegExp(value, "i");
          return regex.test(message);
        } catch {
          return false;
        }
      }

      case "contact_tag":
        return contact.tags.includes(value);

      case "time": {
        // value format: "HH:MM-HH:MM" (business hours check)
        const [start, end] = value.split("-").map((t) => t.trim());
        if (!start || !end) return false;
        const now = new Date();
        const [startH, startM] = start.split(":").map(Number);
        const [endH, endM] = end.split(":").map(Number);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }

      case "custom": {
        // Simple expression evaluation for context variables
        // e.g., "order_count > 5"
        try {
          const allVars = { ...context.variables, ...context.collected_data };
          // Very basic: check if a variable equals a value
          const match = value.match(/^(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
          if (!match) return false;
          const [, varName, op, expected] = match;
          const actual = allVars[varName];
          const numActual = Number(actual);
          const numExpected = Number(expected);
          switch (op) {
            case "==": return String(actual) === expected;
            case "!=": return String(actual) !== expected;
            case ">": return numActual > numExpected;
            case "<": return numActual < numExpected;
            case ">=": return numActual >= numExpected;
            case "<=": return numActual <= numExpected;
            default: return false;
          }
        } catch {
          return false;
        }
      }

      default:
        return false;
    }
  }

  private getDelayMs(duration: number, unit: string): number {
    switch (unit) {
      case "seconds": return duration * 1000;
      case "minutes": return duration * 60 * 1000;
      case "hours": return duration * 60 * 60 * 1000;
      case "days": return duration * 24 * 60 * 60 * 1000;
      default: return duration * 60 * 1000;
    }
  }
}
