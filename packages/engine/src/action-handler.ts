import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult, ConversationContext, ContactData } from "./types";

export class ActionHandler {
  constructor(private supabase: SupabaseClient) {}

  async executeAction(
    actionType: string,
    actionValue: string,
    context: ConversationContext,
    contact: ContactData,
    conversationId: string,
    botId: string
  ): Promise<ActionResult> {
    switch (actionType) {
      case "add_tag":
        return this.addTag(contact.id, actionValue);

      case "remove_tag":
        return this.removeTag(contact.id, actionValue);

      case "update_contact":
        return this.updateContact(contact.id, actionValue);

      case "handoff":
        return this.humanHandoff(conversationId, actionValue);

      case "close_conversation":
        return this.closeConversation(conversationId);

      case "notify":
        return this.sendNotification(botId, actionValue, contact, context);

      case "webhook":
        return this.callWebhook(actionValue, context, contact);

      default:
        return {
          type: actionType,
          success: false,
          error: `Unknown action type: ${actionType}`,
        };
    }
  }

  private async addTag(contactId: string, tag: string): Promise<ActionResult> {
    try {
      const { data: contact } = await this.supabase
        .from("contacts")
        .select("tags")
        .eq("id", contactId)
        .single();

      if (!contact) {
        return { type: "add_tag", success: false, error: "Contact not found" };
      }

      const currentTags = (contact.tags as string[]) || [];
      if (!currentTags.includes(tag)) {
        await this.supabase
          .from("contacts")
          .update({ tags: [...currentTags, tag] })
          .eq("id", contactId);
      }

      return { type: "add_tag", success: true, data: { tag } };
    } catch (error) {
      return {
        type: "add_tag",
        success: false,
        error: String(error),
      };
    }
  }

  private async removeTag(
    contactId: string,
    tag: string
  ): Promise<ActionResult> {
    try {
      const { data: contact } = await this.supabase
        .from("contacts")
        .select("tags")
        .eq("id", contactId)
        .single();

      if (!contact) {
        return { type: "remove_tag", success: false, error: "Contact not found" };
      }

      const currentTags = (contact.tags as string[]) || [];
      await this.supabase
        .from("contacts")
        .update({ tags: currentTags.filter((t) => t !== tag) })
        .eq("id", contactId);

      return { type: "remove_tag", success: true, data: { tag } };
    } catch (error) {
      return { type: "remove_tag", success: false, error: String(error) };
    }
  }

  private async updateContact(
    contactId: string,
    updateStr: string
  ): Promise<ActionResult> {
    try {
      // updateStr format: "field=value" e.g., "name=John" or "email=john@test.com"
      const [field, ...valueParts] = updateStr.split("=");
      const value = valueParts.join("=");

      const allowedFields = ["name", "email", "phone"];
      if (!allowedFields.includes(field)) {
        // Update custom fields instead
        const { data: contact } = await this.supabase
          .from("contacts")
          .select("custom_fields")
          .eq("id", contactId)
          .single();

        const customFields =
          (contact?.custom_fields as Record<string, unknown>) || {};
        customFields[field] = value;

        await this.supabase
          .from("contacts")
          .update({ custom_fields: customFields })
          .eq("id", contactId);
      } else {
        await this.supabase
          .from("contacts")
          .update({ [field]: value })
          .eq("id", contactId);
      }

      return {
        type: "update_contact",
        success: true,
        data: { field, value },
      };
    } catch (error) {
      return {
        type: "update_contact",
        success: false,
        error: String(error),
      };
    }
  }

  private async humanHandoff(
    conversationId: string,
    assignee?: string
  ): Promise<ActionResult> {
    try {
      const update: Record<string, unknown> = {
        status: "handed_off",
        updated_at: new Date().toISOString(),
      };

      if (assignee) {
        update.assigned_to = assignee;
      }

      await this.supabase
        .from("conversations")
        .update(update)
        .eq("id", conversationId);

      return {
        type: "handoff",
        success: true,
        data: { assignee },
      };
    } catch (error) {
      return { type: "handoff", success: false, error: String(error) };
    }
  }

  private async closeConversation(
    conversationId: string
  ): Promise<ActionResult> {
    try {
      await this.supabase
        .from("conversations")
        .update({
          status: "closed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      return { type: "close_conversation", success: true };
    } catch (error) {
      return {
        type: "close_conversation",
        success: false,
        error: String(error),
      };
    }
  }

  private async sendNotification(
    botId: string,
    target: string,
    contact: ContactData,
    context: ConversationContext
  ): Promise<ActionResult> {
    try {
      // Record notification as analytics event
      await this.supabase.from("analytics_events").insert({
        bot_id: botId,
        event_type: "notification_sent",
        event_data: {
          target,
          contact_name: contact.name,
          contact_phone: contact.phone,
          collected_data: context.collected_data,
        },
        contact_id: contact.id,
      });

      return {
        type: "notify",
        success: true,
        data: { target },
      };
    } catch (error) {
      return { type: "notify", success: false, error: String(error) };
    }
  }

  private async callWebhook(
    url: string,
    context: ConversationContext,
    contact: ContactData
  ): Promise<ActionResult> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            tags: contact.tags,
          },
          collected_data: context.collected_data,
          variables: context.variables,
        }),
      });

      const responseData = await response.json().catch(() => null);

      return {
        type: "webhook",
        success: response.ok,
        data: responseData,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return { type: "webhook", success: false, error: String(error) };
    }
  }
}
