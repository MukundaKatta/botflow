import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationContext,
  BotConfig,
  KnowledgeEntry,
  ContactData,
} from "./types";

export class AIResponder {
  private client: Anthropic;

  constructor(
    apiKey: string,
    private supabase: SupabaseClient
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async getKnowledgeBase(botId: string): Promise<KnowledgeEntry[]> {
    const { data } = await this.supabase
      .from("knowledge_base")
      .select("id, title, content, category")
      .eq("bot_id", botId)
      .eq("is_active", true);

    return (data as KnowledgeEntry[]) || [];
  }

  buildSystemPrompt(
    botConfig: BotConfig,
    knowledge: KnowledgeEntry[],
    contact: ContactData,
    channel: string
  ): string {
    const parts: string[] = [];

    // Base system prompt
    if (botConfig.system_prompt) {
      parts.push(botConfig.system_prompt);
    } else {
      parts.push(
        "You are a helpful business assistant. Be friendly, concise, and professional. " +
          "Answer questions based on the knowledge base provided. " +
          "If you don't know the answer, say so honestly and offer to connect with a human agent."
      );
    }

    // Channel-specific instructions
    parts.push(
      `\nYou are communicating via ${channel}. Keep messages concise and suitable for mobile messaging. ` +
        "Use short paragraphs. Avoid markdown formatting. Use plain text with emoji when appropriate."
    );

    // Contact context
    if (contact.name) {
      parts.push(`\nThe customer's name is ${contact.name}.`);
    }
    if (contact.tags.length > 0) {
      parts.push(`Customer tags: ${contact.tags.join(", ")}.`);
    }

    // Knowledge base
    if (knowledge.length > 0) {
      parts.push("\n--- KNOWLEDGE BASE ---");
      for (const entry of knowledge) {
        const category = entry.category ? `[${entry.category}] ` : "";
        parts.push(`\n${category}${entry.title}:\n${entry.content}`);
      }
      parts.push("\n--- END KNOWLEDGE BASE ---");
      parts.push(
        "\nUse the knowledge base above to answer questions. " +
          "Only reference information that is in the knowledge base. " +
          "Do not make up information."
      );
    }

    return parts.join("\n");
  }

  async generateResponse(
    botConfig: BotConfig,
    context: ConversationContext,
    contact: ContactData,
    channel: string,
    overrideSystemPrompt?: string,
    overrideTemperature?: number
  ): Promise<string> {
    const knowledge = await this.getKnowledgeBase(botConfig.id);

    const systemPrompt =
      overrideSystemPrompt ||
      this.buildSystemPrompt(botConfig, knowledge, contact, channel);

    const messages = context.message_history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Ensure at least one user message
    if (messages.length === 0) {
      return "Hello! How can I help you today?";
    }

    try {
      const response = await this.client.messages.create({
        model: botConfig.ai_model || "claude-sonnet-4-20250514",
        max_tokens: 500,
        temperature: overrideTemperature ?? botConfig.ai_temperature ?? 0.7,
        system: systemPrompt,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("AI response generation failed:", error);
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  /**
   * Generate a response for a specific intent/context
   */
  async generateContextualResponse(
    botConfig: BotConfig,
    context: ConversationContext,
    contact: ContactData,
    channel: string,
    instruction: string
  ): Promise<string> {
    const knowledge = await this.getKnowledgeBase(botConfig.id);
    const basePrompt = this.buildSystemPrompt(
      botConfig,
      knowledge,
      contact,
      channel
    );

    const systemPrompt = `${basePrompt}\n\nAdditional instruction: ${instruction}`;

    const messages = context.message_history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    if (messages.length === 0) return "";

    try {
      const response = await this.client.messages.create({
        model: botConfig.ai_model || "claude-sonnet-4-20250514",
        max_tokens: 500,
        temperature: botConfig.ai_temperature ?? 0.7,
        system: systemPrompt,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text || "";
    } catch (error) {
      console.error("Contextual AI response failed:", error);
      return "";
    }
  }
}
