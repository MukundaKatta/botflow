import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const planLimits: Record<string, { plan: string; limit: number }> = {
  price_starter: { plan: "starter", limit: 5000 },
  price_pro: { plan: "pro", limit: 25000 },
  price_enterprise: { plan: "enterprise", limit: 1000000 },
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id || "";
      const planInfo = planLimits[priceId] || { plan: "starter", limit: 5000 };

      // Update organization
      await supabase
        .from("organizations")
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: planInfo.plan as "starter" | "pro" | "enterprise",
          monthly_message_limit: planInfo.limit,
        })
        .eq("stripe_customer_id", customerId);

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id || "";
      const planInfo = planLimits[priceId] || { plan: "starter", limit: 5000 };

      if (subscription.status === "active") {
        await supabase
          .from("organizations")
          .update({
            plan: planInfo.plan as "starter" | "pro" | "enterprise",
            monthly_message_limit: planInfo.limit,
          })
          .eq("stripe_customer_id", customerId);
      }

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Downgrade to free plan
      await supabase
        .from("organizations")
        .update({
          plan: "free",
          monthly_message_limit: 500,
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", customerId);

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      // Log the payment failure
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (org) {
        // Could send notification, downgrade, etc.
        console.error(`Payment failed for org: ${org.id}`);
      }

      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return NextResponse.json({ received: true });
}
