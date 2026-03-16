import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Verify Instagram webhook signature
function verifySignature(body: string, signature: string, appSecret: string): boolean {
  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(body)
    .digest("hex");
  return `sha256=${expectedSig}` === signature;
}

// Webhook verification (GET request from Meta)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Process incoming messages (POST from Meta)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify signature
    const signature = request.headers.get("x-hub-signature-256") || "";
    const appSecret = process.env.INSTAGRAM_APP_SECRET || "";

    if (appSecret && signature) {
      if (!verifySignature(rawBody, signature, appSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const body = JSON.parse(rawBody);
    const supabase = createServiceRoleClient();

    // Process each entry from the webhook payload
    for (const entry of body.entry || []) {
      const pageId = entry.id;

      for (const messagingEvent of entry.messaging || []) {
        const senderId = messagingEvent.sender?.id;
        const message = messagingEvent.message;

        if (!senderId || !message) continue;

        // Skip echo messages (messages sent by us)
        if (message.is_echo) continue;

        const messageText = message.text || "";
        const attachments = message.attachments || [];

        // Find the bot by Instagram page ID
        const { data: bots } = await supabase
          .from("bots")
          .select("*")
          .eq("instagram_page_id", pageId)
          .eq("status", "active")
          .limit(1);

        const bot = bots?.[0];
        if (!bot) {
          console.error(`No active bot for Instagram page: ${pageId}`);
          continue;
        }

        // Find or create contact by instagram_id
        let { data: contact } = await supabase
          .from("contacts")
          .select("*")
          .eq("instagram_id", senderId)
          .eq("organization_id", bot.organization_id)
          .single();

        if (!contact) {
          // Try to fetch user profile from Instagram
          let name: string | null = null;
          try {
            const profileRes = await fetch(
              `https://graph.instagram.com/v18.0/${senderId}?fields=name,username&access_token=${process.env.META_ACCESS_TOKEN}`
            );
            if (profileRes.ok) {
              const profile = await profileRes.json();
              name = profile.name || profile.username || null;
            }
          } catch {
            // Profile fetch is best-effort
          }

          const { data: newContact } = await supabase
            .from("contacts")
            .insert({
              organization_id: bot.organization_id,
              instagram_id: senderId,
              name,
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

        if (!contact) continue;

        // Find or create conversation
        let { data: conversation } = await supabase
          .from("conversations")
          .select("*")
          .eq("bot_id", bot.id)
          .eq("contact_id", contact.id)
          .eq("channel", "instagram")
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
              channel: "instagram",
              status: "active",
              context: {},
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single();
          conversation = newConvo;
        }

        if (!conversation) continue;

        // Determine content type
        let contentType: "text" | "image" | "audio" | "video" = "text";
        let mediaUrl: string | null = null;
        if (attachments.length > 0) {
          const attachment = attachments[0];
          contentType = attachment.type === "image" ? "image" : attachment.type === "audio" ? "audio" : attachment.type === "video" ? "video" : "text";
          mediaUrl = attachment.payload?.url || null;
        }

        // Store inbound message
        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          direction: "inbound",
          content: messageText,
          content_type: contentType,
          media_url: mediaUrl,
          external_id: message.mid,
          status: "delivered",
        });

        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversation.id);

        // Track analytics
        await supabase.from("analytics_events").insert({
          bot_id: bot.id,
          event_type: "message_received",
          event_data: { channel: "instagram", content_type: contentType },
          contact_id: contact.id,
          conversation_id: conversation.id,
        });

        // Process through engine if not handed off
        if (conversation.status !== "handed_off") {
          try {
            await fetch(
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
                  message: messageText,
                  channel: "instagram",
                }),
              }
            );
          } catch (err) {
            console.error("Failed to call engine:", err);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Instagram webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
