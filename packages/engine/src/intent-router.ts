import type { SupabaseClient } from "@supabase/supabase-js";
import type { FlowData, FlowNode, ConversationContext } from "./types";

interface FlowMatch {
  flowId: string;
  nodeId: string;
  flow: FlowData;
  score: number;
}

export class IntentRouter {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Find the best matching flow for an incoming message
   */
  async routeMessage(
    botId: string,
    message: string,
    context: ConversationContext
  ): Promise<FlowMatch | null> {
    // If conversation already has an active flow and node, continue from there
    if (context.current_flow_id && context.current_node_id) {
      const { data: flow } = await this.supabase
        .from("flows")
        .select("*")
        .eq("id", context.current_flow_id)
        .eq("is_active", true)
        .single();

      if (flow) {
        const flowData = flow.flow_data as FlowData;
        return {
          flowId: flow.id,
          nodeId: context.current_node_id,
          flow: flowData,
          score: 100,
        };
      }
    }

    // Load all active flows for this bot
    const { data: flows } = await this.supabase
      .from("flows")
      .select("*")
      .eq("bot_id", botId)
      .eq("is_active", true)
      .order("is_default", { ascending: false });

    if (!flows || flows.length === 0) return null;

    const matches: FlowMatch[] = [];

    for (const flow of flows) {
      const flowData = flow.flow_data as FlowData;
      if (!flowData?.nodes) continue;

      // Find trigger nodes
      const triggerNodes = flowData.nodes.filter((n) => n.type === "trigger");

      for (const trigger of triggerNodes) {
        const score = this.scoreTriggerMatch(trigger, message, flow.trigger_type, flow.trigger_config as Record<string, unknown>);
        if (score > 0) {
          matches.push({
            flowId: flow.id,
            nodeId: trigger.id,
            flow: flowData,
            score,
          });
        }
      }
    }

    // Sort by score descending and return best match
    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
      return matches[0];
    }

    // Fall back to default flow if exists
    const defaultFlow = flows.find((f) => f.is_default);
    if (defaultFlow) {
      const flowData = defaultFlow.flow_data as FlowData;
      const trigger = flowData.nodes?.find((n) => n.type === "trigger");
      if (trigger) {
        return {
          flowId: defaultFlow.id,
          nodeId: trigger.id,
          flow: flowData,
          score: 1,
        };
      }
    }

    return null;
  }

  /**
   * Score how well a message matches a trigger node
   */
  private scoreTriggerMatch(
    trigger: FlowNode,
    message: string,
    triggerType: string,
    triggerConfig: Record<string, unknown>
  ): number {
    const config = trigger.data.config || triggerConfig || {};
    const type = (config.triggerType as string) || triggerType || "message";
    const lowerMessage = message.toLowerCase().trim();

    switch (type) {
      case "message":
        // Matches any message
        return 10;

      case "keyword": {
        const keywordsStr = (config.keywords as string) || "";
        const keywords = keywordsStr
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean);

        if (keywords.length === 0) return 0;

        // Exact match gets highest score
        if (keywords.includes(lowerMessage)) return 90;

        // Partial match (keyword contained in message)
        for (const keyword of keywords) {
          if (lowerMessage.includes(keyword)) {
            return 70;
          }
        }

        // Word-level match
        const words = lowerMessage.split(/\s+/);
        for (const keyword of keywords) {
          if (words.includes(keyword)) {
            return 80;
          }
        }

        return 0;
      }

      case "button": {
        const buttonId = (config.buttonId as string) || "";
        if (buttonId && lowerMessage === buttonId.toLowerCase()) {
          return 95;
        }
        return 0;
      }

      case "scheduled":
        // Scheduled triggers are handled by cron, not message routing
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Find the next node(s) after a given node in the flow
   */
  getNextNodes(
    flow: FlowData,
    currentNodeId: string,
    handleId?: string
  ): FlowNode[] {
    const edges = flow.edges.filter((e) => {
      if (e.source !== currentNodeId) return false;
      if (handleId && e.sourceHandle) return e.sourceHandle === handleId;
      return true;
    });

    return edges
      .map((e) => flow.nodes.find((n) => n.id === e.target))
      .filter((n): n is FlowNode => n !== undefined);
  }
}
