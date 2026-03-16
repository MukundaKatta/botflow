export interface SendMessageOptions {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface SendTemplateOptions {
  to: string;
  templateName: string;
  variables?: string[];
  language?: string;
}

export interface MessageResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface ChannelAdapter {
  sendMessage(options: SendMessageOptions): Promise<MessageResult>;
  sendTemplate?(options: SendTemplateOptions): Promise<MessageResult>;
}
