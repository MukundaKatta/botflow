export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: "free" | "starter" | "pro" | "enterprise";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          monthly_message_limit: number;
          messages_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: "free" | "starter" | "pro" | "enterprise";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          monthly_message_limit?: number;
          messages_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          plan?: "free" | "starter" | "pro" | "enterprise";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          monthly_message_limit?: number;
          messages_used?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
      };
      bots: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: "draft" | "active" | "paused";
          channels: string[];
          whatsapp_number: string | null;
          sms_number: string | null;
          instagram_page_id: string | null;
          system_prompt: string | null;
          ai_model: string;
          ai_temperature: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          status?: "draft" | "active" | "paused";
          channels?: string[];
          whatsapp_number?: string | null;
          sms_number?: string | null;
          instagram_page_id?: string | null;
          system_prompt?: string | null;
          ai_model?: string;
          ai_temperature?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          status?: "draft" | "active" | "paused";
          channels?: string[];
          whatsapp_number?: string | null;
          sms_number?: string | null;
          instagram_page_id?: string | null;
          system_prompt?: string | null;
          ai_model?: string;
          ai_temperature?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      flows: {
        Row: {
          id: string;
          bot_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          is_default: boolean;
          trigger_type: "message" | "keyword" | "button" | "scheduled";
          trigger_config: Json;
          flow_data: Json;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          is_default?: boolean;
          trigger_type?: "message" | "keyword" | "button" | "scheduled";
          trigger_config?: Json;
          flow_data?: Json;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bot_id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          is_default?: boolean;
          trigger_type?: "message" | "keyword" | "button" | "scheduled";
          trigger_config?: Json;
          flow_data?: Json;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          organization_id: string;
          phone: string | null;
          instagram_id: string | null;
          name: string | null;
          email: string | null;
          tags: string[];
          custom_fields: Json;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          phone?: string | null;
          instagram_id?: string | null;
          name?: string | null;
          email?: string | null;
          tags?: string[];
          custom_fields?: Json;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          phone?: string | null;
          instagram_id?: string | null;
          name?: string | null;
          email?: string | null;
          tags?: string[];
          custom_fields?: Json;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          bot_id: string;
          contact_id: string;
          channel: "whatsapp" | "sms" | "instagram";
          status: "active" | "closed" | "handed_off";
          assigned_to: string | null;
          current_flow_id: string | null;
          current_node_id: string | null;
          context: Json;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          contact_id: string;
          channel: "whatsapp" | "sms" | "instagram";
          status?: "active" | "closed" | "handed_off";
          assigned_to?: string | null;
          current_flow_id?: string | null;
          current_node_id?: string | null;
          context?: Json;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bot_id?: string;
          contact_id?: string;
          channel?: "whatsapp" | "sms" | "instagram";
          status?: "active" | "closed" | "handed_off";
          assigned_to?: string | null;
          current_flow_id?: string | null;
          current_node_id?: string | null;
          context?: Json;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          direction: "inbound" | "outbound";
          content: string;
          content_type: "text" | "image" | "audio" | "video" | "document" | "template" | "interactive";
          media_url: string | null;
          external_id: string | null;
          status: "pending" | "sent" | "delivered" | "read" | "failed";
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          direction: "inbound" | "outbound";
          content: string;
          content_type?: "text" | "image" | "audio" | "video" | "document" | "template" | "interactive";
          media_url?: string | null;
          external_id?: string | null;
          status?: "pending" | "sent" | "delivered" | "read" | "failed";
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          direction?: "inbound" | "outbound";
          content?: string;
          content_type?: "text" | "image" | "audio" | "video" | "document" | "template" | "interactive";
          media_url?: string | null;
          external_id?: string | null;
          status?: "pending" | "sent" | "delivered" | "read" | "failed";
          metadata?: Json;
          created_at?: string;
        };
      };
      broadcasts: {
        Row: {
          id: string;
          bot_id: string;
          name: string;
          channel: "whatsapp" | "sms" | "instagram";
          template_name: string | null;
          content: string;
          audience_filter: Json;
          status: "draft" | "scheduled" | "sending" | "sent" | "failed";
          scheduled_at: string | null;
          sent_count: number;
          delivered_count: number;
          read_count: number;
          failed_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          name: string;
          channel: "whatsapp" | "sms" | "instagram";
          template_name?: string | null;
          content: string;
          audience_filter?: Json;
          status?: "draft" | "scheduled" | "sending" | "sent" | "failed";
          scheduled_at?: string | null;
          sent_count?: number;
          delivered_count?: number;
          read_count?: number;
          failed_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bot_id?: string;
          name?: string;
          channel?: "whatsapp" | "sms" | "instagram";
          template_name?: string | null;
          content?: string;
          audience_filter?: Json;
          status?: "draft" | "scheduled" | "sending" | "sent" | "failed";
          scheduled_at?: string | null;
          sent_count?: number;
          delivered_count?: number;
          read_count?: number;
          failed_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      knowledge_base: {
        Row: {
          id: string;
          bot_id: string;
          title: string;
          content: string;
          category: string | null;
          embedding: number[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          title: string;
          content: string;
          category?: string | null;
          embedding?: number[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bot_id?: string;
          title?: string;
          content?: string;
          category?: string | null;
          embedding?: number[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          bot_id: string;
          event_type: string;
          event_data: Json;
          contact_id: string | null;
          conversation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bot_id: string;
          event_type: string;
          event_data?: Json;
          contact_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          bot_id?: string;
          event_type?: string;
          event_data?: Json;
          contact_id?: string | null;
          conversation_id?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Bot = Tables<"bots">;
export type Flow = Tables<"flows">;
export type Contact = Tables<"contacts">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;
export type Broadcast = Tables<"broadcasts">;
export type KnowledgeBase = Tables<"knowledge_base">;
export type Organization = Tables<"organizations">;
export type AnalyticsEvent = Tables<"analytics_events">;
