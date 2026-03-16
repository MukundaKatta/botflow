import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessMessageRequest {
  bot_id: string;
  conversation_id: string;
  contact_id: string;
  message: string;
  channel: "whatsapp" | "sms" | "instagram";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: ProcessMessageRequest = await req.json();
    const { bot_id, conversation_id, contact_id, message, channel } = body;

    // Load bot config
    const { data: bot } = await supabase
      .from("bots")
      .select("*")
      .eq("id", bot_id)
      .single();

    if (!bot) {
      return new Response(JSON.stringify({ error: "Bot not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check message quota
    const { data: org } = await supabase
      .from("organizations")
      .select("messages_used, monthly_message_limit")
      .eq("id", bot.organization_id)
      .single();

    if (org && org.messages_used >= org.monthly_message_limit) {
      // Over quota - send a message about it but don't process
      await supabase.from("messages").insert({
        conversation_id,
        direction: "outbound",
        content: "We apologize, but we've reached our messaging limit. Please try again later or contact us directly.",
        content_type: "text",
        status: "pending",
      });
      return new Response(JSON.stringify({ error: "Quota exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load conversation context
    const { data: conversation } = await supabase
      .from("conversations")
      .select("context, current_flow_id, current_node_id")
      .eq("id", conversation_id)
      .single();

    const context = (conversation?.context as Record<string, unknown>) || {
      variables: {},
      collected_data: {},
      message_history: [],
    };

    // Add user message to history
    const messageHistory = (context.message_history as Array<{ role: string; content: string }>) || [];
    messageHistory.push({ role: "user", content: message });

    // Trim history
    while (messageHistory.length > 20) {
      messageHistory.shift();
    }

    // Load active flows
    const { data: flows } = await supabase
      .from("flows")
      .select("*")
      .eq("bot_id", bot_id)
      .eq("is_active", true)
      .order("is_default", { ascending: false });

    // Load knowledge base
    const { data: knowledge } = await supabase
      .from("knowledge_base")
      .select("title, content, category")
      .eq("bot_id", bot_id)
      .eq("is_active", true);

    // Load contact
    const { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contact_id)
      .single();

    // Build system prompt with knowledge base
    let systemPrompt = bot.system_prompt || "You are a helpful business assistant. Be friendly, concise, and professional.";

    if (channel) {
      systemPrompt += `\nYou are communicating via ${channel}. Keep messages concise for mobile messaging.`;
    }

    if (contact?.name) {
      systemPrompt += `\nThe customer's name is ${contact.name}.`;
    }

    if (knowledge && knowledge.length > 0) {
      systemPrompt += "\n\n--- KNOWLEDGE BASE ---";
      for (const entry of knowledge) {
        const cat = entry.category ? `[${entry.category}] ` : "";
        systemPrompt += `\n${cat}${entry.title}:\n${entry.content}`;
      }
      systemPrompt += "\n--- END KNOWLEDGE BASE ---";
      systemPrompt += "\nUse the knowledge base to answer questions. Do not make up information.";
    }

    // Call Claude API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "Anthropic API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: bot.ai_model || "claude-sonnet-4-20250514",
        max_tokens: 500,
        temperature: bot.ai_temperature || 0.7,
        system: systemPrompt,
        messages: messageHistory.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeResponse.json();
    const aiText = claudeData.content?.[0]?.text || "I apologize, I couldn't generate a response.";

    // Add assistant response to history
    messageHistory.push({ role: "assistant", content: aiText });

    // Save outbound message
    await supabase.from("messages").insert({
      conversation_id,
      direction: "outbound",
      content: aiText,
      content_type: "text",
      status: "pending",
    });

    // Update conversation context
    await supabase.from("conversations").update({
      context: { ...context, message_history: messageHistory },
      last_message_at: new Date().toISOString(),
    }).eq("id", conversation_id);

    // Send the actual message via channel adapter
    await sendViaChannel(channel, contact, aiText, bot);

    // Update message status to sent
    // (In production, the status callback from Twilio/Meta would update this)

    // Track analytics
    await supabase.from("analytics_events").insert({
      bot_id,
      event_type: "ai_response_sent",
      event_data: {
        channel,
        model: bot.ai_model,
        tokens_used: claudeData.usage?.output_tokens || 0,
      },
      contact_id,
      conversation_id,
    });

    return new Response(
      JSON.stringify({ success: true, response: aiText }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Process message error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendViaChannel(
  channel: string,
  contact: Record<string, unknown> | null,
  message: string,
  bot: Record<string, unknown>
) {
  if (channel === "whatsapp" || channel === "sms") {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!accountSid || !authToken) return;

    const from = channel === "whatsapp"
      ? `whatsapp:${bot.whatsapp_number || Deno.env.get("TWILIO_WHATSAPP_NUMBER")}`
      : bot.sms_number || Deno.env.get("TWILIO_SMS_NUMBER");

    const to = channel === "whatsapp"
      ? `whatsapp:${contact?.phone}`
      : contact?.phone;

    if (!to) return;

    const params = new URLSearchParams();
    params.append("From", from as string);
    params.append("To", to as string);
    params.append("Body", message);

    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
        body: params.toString(),
      }
    );
  } else if (channel === "instagram") {
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    const pageId = bot.instagram_page_id;
    if (!accessToken || !pageId || !contact?.instagram_id) return;

    await fetch(`https://graph.instagram.com/v18.0/${pageId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: contact.instagram_id },
        message: { text: message },
      }),
    });
  }
}
