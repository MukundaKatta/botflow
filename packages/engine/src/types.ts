export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    config?: Record<string, unknown>;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ConversationContext {
  current_flow_id?: string;
  current_node_id?: string;
  variables: Record<string, unknown>;
  collected_data: Record<string, unknown>;
  message_history: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  last_intent?: string;
  waiting_for_input?: boolean;
  delay_until?: string;
}

export interface ProcessMessageInput {
  bot_id: string;
  conversation_id: string;
  contact_id: string;
  message: string;
  channel: "whatsapp" | "sms" | "instagram";
}

export interface ProcessMessageResult {
  responses: string[];
  actions: ActionResult[];
  context: ConversationContext;
  should_close?: boolean;
}

export interface ActionResult {
  type: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface BotConfig {
  id: string;
  organization_id: string;
  system_prompt: string | null;
  ai_model: string;
  ai_temperature: number;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string | null;
}

export interface ContactData {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
}
