import Twilio from "twilio";
import type {
  ChannelAdapter,
  SendMessageOptions,
  SendTemplateOptions,
  MessageResult,
} from "./types";

export interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // e.g., "whatsapp:+14155238886"
}

export class WhatsAppAdapter implements ChannelAdapter {
  private client: Twilio.Twilio;
  private fromNumber: string;

  constructor(config: WhatsAppConfig) {
    this.client = Twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber.startsWith("whatsapp:")
      ? config.fromNumber
      : `whatsapp:${config.fromNumber}`;
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    try {
      const to = options.to.startsWith("whatsapp:")
        ? options.to
        : `whatsapp:${options.to}`;

      const messageParams: {
        from: string;
        to: string;
        body: string;
        mediaUrl?: string[];
      } = {
        from: this.fromNumber,
        to,
        body: options.body,
      };

      if (options.mediaUrl) {
        messageParams.mediaUrl = [options.mediaUrl];
      }

      const message = await this.client.messages.create(messageParams);

      return {
        success: true,
        externalId: message.sid,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("WhatsApp send failed:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendTemplate(options: SendTemplateOptions): Promise<MessageResult> {
    try {
      const to = options.to.startsWith("whatsapp:")
        ? options.to
        : `whatsapp:${options.to}`;

      // Build content SID-based template message
      // For Twilio Content API templates
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body: this.buildTemplateBody(
          options.templateName,
          options.variables || []
        ),
      });

      return {
        success: true,
        externalId: message.sid,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("WhatsApp template send failed:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Build template body from template name and variables.
   * In production, this would use Twilio Content API or pre-approved templates.
   */
  private buildTemplateBody(
    templateName: string,
    variables: string[]
  ): string {
    // This is a simplified version. In production, you would:
    // 1. Look up the template by name from your template registry
    // 2. Substitute variables into the template
    // 3. Or use Twilio Content API SIDs
    let body = `[Template: ${templateName}]`;
    if (variables.length > 0) {
      body += ` Variables: ${variables.join(", ")}`;
    }
    return body;
  }

  /**
   * Send an interactive button message (WhatsApp Interactive)
   */
  async sendInteractiveButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<MessageResult> {
    try {
      const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

      // Twilio supports interactive messages via Content API
      // For simplicity, we'll send as text with button options
      const buttonText = buttons
        .map((b, i) => `${i + 1}. ${b.title}`)
        .join("\n");
      const fullBody = `${body}\n\n${buttonText}\n\nReply with the number of your choice.`;

      const message = await this.client.messages.create({
        from: this.fromNumber,
        to: toNumber,
        body: fullBody,
      });

      return { success: true, externalId: message.sid };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
