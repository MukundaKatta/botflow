import Twilio from "twilio";
import type {
  ChannelAdapter,
  SendMessageOptions,
  MessageResult,
} from "./types";

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // e.g., "+14155238886"
}

export class SMSAdapter implements ChannelAdapter {
  private client: Twilio.Twilio;
  private fromNumber: string;

  constructor(config: SMSConfig) {
    this.client = Twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    try {
      const messageParams: {
        from: string;
        to: string;
        body: string;
        mediaUrl?: string[];
      } = {
        from: this.fromNumber,
        to: options.to,
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
      console.error("SMS send failed:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send a message split into segments if it exceeds SMS character limits.
   * Standard SMS is 160 characters (GSM-7) or 70 (UCS-2/Unicode).
   */
  async sendLongMessage(
    to: string,
    body: string
  ): Promise<MessageResult[]> {
    const MAX_LENGTH = 1600; // Twilio concatenates up to ~1600 chars
    const results: MessageResult[] = [];

    if (body.length <= MAX_LENGTH) {
      const result = await this.sendMessage({ to, body });
      results.push(result);
    } else {
      // Split into chunks
      const chunks: string[] = [];
      let remaining = body;
      while (remaining.length > 0) {
        if (remaining.length <= MAX_LENGTH) {
          chunks.push(remaining);
          break;
        }
        // Try to split at last space before limit
        let splitAt = remaining.lastIndexOf(" ", MAX_LENGTH);
        if (splitAt === -1) splitAt = MAX_LENGTH;
        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt).trimStart();
      }

      for (const chunk of chunks) {
        const result = await this.sendMessage({ to, body: chunk });
        results.push(result);
        if (!result.success) break;
      }
    }

    return results;
  }

  /**
   * Check if a phone number is a valid E.164 format
   */
  static isValidPhoneNumber(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  /**
   * Look up carrier info for a phone number (for opt-out compliance)
   */
  async lookupNumber(
    phone: string
  ): Promise<{ carrier: string | null; type: string | null } | null> {
    try {
      const lookup = await this.client.lookups.v2
        .phoneNumbers(phone)
        .fetch({ fields: "line_type_intelligence" });

      return {
        carrier: lookup.lineTypeIntelligence?.carrier_name || null,
        type: lookup.lineTypeIntelligence?.type || null,
      };
    } catch {
      return null;
    }
  }
}
