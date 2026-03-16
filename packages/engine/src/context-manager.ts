import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationContext } from "./types";

const DEFAULT_CONTEXT: ConversationContext = {
  variables: {},
  collected_data: {},
  message_history: [],
  waiting_for_input: false,
};

const MAX_HISTORY_LENGTH = 20;

export class ContextManager {
  constructor(private supabase: SupabaseClient) {}

  async getContext(conversationId: string): Promise<ConversationContext> {
    const { data } = await this.supabase
      .from("conversations")
      .select("context, current_flow_id, current_node_id")
      .eq("id", conversationId)
      .single();

    if (!data) return { ...DEFAULT_CONTEXT };

    const ctx = (data.context as ConversationContext) || { ...DEFAULT_CONTEXT };
    ctx.current_flow_id = data.current_flow_id || undefined;
    ctx.current_node_id = data.current_node_id || undefined;

    // Ensure all required fields exist
    ctx.variables = ctx.variables || {};
    ctx.collected_data = ctx.collected_data || {};
    ctx.message_history = ctx.message_history || [];

    return ctx;
  }

  async updateContext(
    conversationId: string,
    context: ConversationContext
  ): Promise<void> {
    // Trim message history to prevent context from growing too large
    if (context.message_history.length > MAX_HISTORY_LENGTH) {
      context.message_history = context.message_history.slice(
        -MAX_HISTORY_LENGTH
      );
    }

    await this.supabase
      .from("conversations")
      .update({
        context,
        current_flow_id: context.current_flow_id || null,
        current_node_id: context.current_node_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  }

  addUserMessage(context: ConversationContext, message: string): void {
    context.message_history.push({ role: "user", content: message });
  }

  addAssistantMessage(context: ConversationContext, message: string): void {
    context.message_history.push({ role: "assistant", content: message });
  }

  setVariable(
    context: ConversationContext,
    key: string,
    value: unknown
  ): void {
    context.variables[key] = value;
  }

  getVariable(context: ConversationContext, key: string): unknown {
    return context.variables[key];
  }

  collectData(
    context: ConversationContext,
    key: string,
    value: unknown
  ): void {
    context.collected_data[key] = value;
  }

  /**
   * Interpolate template variables like {{name}}, {{phone}}, {{input}}
   */
  interpolate(
    template: string,
    context: ConversationContext,
    contact: { name?: string | null; phone?: string | null; email?: string | null },
    lastMessage?: string
  ): string {
    let result = template;

    // Contact fields
    result = result.replace(/\{\{name\}\}/g, contact.name || "there");
    result = result.replace(/\{\{phone\}\}/g, contact.phone || "");
    result = result.replace(/\{\{email\}\}/g, contact.email || "");

    // Last user input
    result = result.replace(/\{\{input\}\}/g, lastMessage || "");

    // Context variables
    for (const [key, value] of Object.entries(context.variables)) {
      result = result.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        String(value ?? "")
      );
    }

    // Collected data
    for (const [key, value] of Object.entries(context.collected_data)) {
      result = result.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        String(value ?? "")
      );
    }

    return result;
  }
}
