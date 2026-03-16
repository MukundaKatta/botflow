import type {
  ChannelAdapter,
  SendMessageOptions,
  MessageResult,
} from "./types";

export interface InstagramConfig {
  accessToken: string;
  pageId: string;
}

export class InstagramAdapter implements ChannelAdapter {
  private accessToken: string;
  private pageId: string;
  private apiBase = "https://graph.instagram.com/v18.0";

  constructor(config: InstagramConfig) {
    this.accessToken = config.accessToken;
    this.pageId = config.pageId;
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    try {
      const response = await fetch(
        `${this.apiBase}/${this.pageId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            recipient: { id: options.to },
            message: { text: options.body },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        externalId: data.message_id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Instagram DM send failed:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send an image message via Instagram DM
   */
  async sendImage(
    to: string,
    imageUrl: string
  ): Promise<MessageResult> {
    try {
      const response = await fetch(
        `${this.apiBase}/${this.pageId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            recipient: { id: to },
            message: {
              attachment: {
                type: "image",
                payload: { url: imageUrl },
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, externalId: data.message_id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send quick reply buttons via Instagram DM
   */
  async sendQuickReplies(
    to: string,
    text: string,
    quickReplies: Array<{
      content_type: "text";
      title: string;
      payload: string;
    }>
  ): Promise<MessageResult> {
    try {
      const response = await fetch(
        `${this.apiBase}/${this.pageId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            recipient: { id: to },
            message: {
              text,
              quick_replies: quickReplies.slice(0, 13), // Instagram max 13 quick replies
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, externalId: data.message_id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send a generic template (carousel) via Instagram DM
   */
  async sendGenericTemplate(
    to: string,
    elements: Array<{
      title: string;
      subtitle?: string;
      image_url?: string;
      buttons?: Array<{
        type: "web_url" | "postback";
        title: string;
        url?: string;
        payload?: string;
      }>;
    }>
  ): Promise<MessageResult> {
    try {
      const response = await fetch(
        `${this.apiBase}/${this.pageId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            recipient: { id: to },
            message: {
              attachment: {
                type: "template",
                payload: {
                  template_type: "generic",
                  elements: elements.slice(0, 10), // Max 10 elements
                },
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, externalId: data.message_id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mark a message as seen (read receipt)
   */
  async markSeen(recipientId: string): Promise<void> {
    try {
      await fetch(`${this.apiBase}/${this.pageId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: "mark_seen",
        }),
      });
    } catch {
      // Best effort - don't throw
    }
  }

  /**
   * Show typing indicator
   */
  async showTyping(recipientId: string): Promise<void> {
    try {
      await fetch(`${this.apiBase}/${this.pageId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: "typing_on",
        }),
      });
    } catch {
      // Best effort
    }
  }
}
