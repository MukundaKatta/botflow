import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Validate Twilio request signature
function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  const data = url + sortedParams;
  const expectedSig = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  return expectedSig === signature;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Validate Twilio signature in production
    const twilioSignature = request.headers.get("x-twilio-signature") || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";

    if (authToken && twilioSignature) {
      const url = `${process.env.WEBHOOK_BASE_URL || request.nextUrl.origin}/api/webhooks/twilio`;
      const isValid = validateTwilioSignature(authToken, url, params, twilioSignature);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const from = params.From || "";
    const to = params.To || "";
    const body = params.Body || "";
    const messageSid = params.MessageSid || "";
    const mediaUrl = params.MediaUrl0 || null;

    // Determine channel based on "whatsapp:" prefix
    const isWhatsApp = from.startsWith("whatsapp:");
    const channel = isWhatsApp ? "whatsapp" : "sms";
    const cleanFrom = from.replace("whatsapp:", "");
    const cleanTo = to.replace("whatsapp:", "");

    const supabase = createServiceRoleClient();

    // Find the bot by channel number
    const botQuery = isWhatsApp
      ? supabase.from("bots").select("*").eq("whatsapp_number", cleanTo).eq("status", "active")
      : supabase.from("bots").select("*").eq("sms_number", cleanTo).eq("status", "active");

    const { data: bots } = await botQuery.limit(1);
    const bot = bots?.[0];

    if (!bot) {
      console.error(`No active bot found for number: ${cleanTo}`);
      return new NextResponse("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Find or create contact
    let { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("phone", cleanFrom)
      .eq("organization_id", bot.organization_id)
      .single();

    if (!contact) {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          organization_id: bot.organization_id,
          phone: cleanFrom,
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();
      contact = newContact;
    } else {
      await supabase
        .from("contacts")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", contact.id);
    }

    if (!contact) {
      return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("bot_id", bot.id)
      .eq("contact_id", contact.id)
      .eq("channel", channel)
      .in("status", ["active", "handed_off"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert({
          bot_id: bot.id,
          contact_id: contact.id,
          channel: channel as "whatsapp" | "sms",
          status: "active",
          context: {},
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      conversation = newConvo;
    }

    if (!conversation) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    // Store inbound message
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      direction: "inbound",
      content: body,
      content_type: mediaUrl ? "image" : "text",
      media_url: mediaUrl,
      external_id: messageSid,
      status: "delivered",
    });

    // Update conversation last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // Track analytics event
    await supabase.from("analytics_events").insert({
      bot_id: bot.id,
      event_type: "message_received",
      event_data: { channel, content_type: mediaUrl ? "image" : "text" },
      contact_id: contact.id,
      conversation_id: conversation.id,
    });

    // Increment org message counter
    await supabase.rpc("increment_messages_used", {
      org_id: bot.organization_id,
    });

    // If conversation is not handed off, process through engine
    if (conversation.status !== "handed_off") {
      // Call the conversation engine via edge function or internal API
      try {
        const engineResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-message`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              bot_id: bot.id,
              conversation_id: conversation.id,
              contact_id: contact.id,
              message: body,
              channel,
            }),
          }
        );

        if (!engineResponse.ok) {
          console.error("Engine processing failed:", await engineResponse.text());
        }
      } catch (err) {
        console.error("Failed to call engine:", err);
      }
    }

    // Return empty TwiML (response sent asynchronously via API)
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Twilio sends GET for status callbacks
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
