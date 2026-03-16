"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Stethoscope,
  ShoppingCart,
  UserCheck,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const templates = [
  {
    id: "restaurant-order",
    name: "Restaurant Ordering",
    description:
      "Complete restaurant bot with menu browsing, ordering, reservations, and business hours.",
    icon: UtensilsCrossed,
    color: "bg-orange-100 text-orange-700",
    channels: ["whatsapp", "sms"],
    features: ["Menu browsing", "Order placement", "Table reservation", "Business hours", "AI FAQ"],
  },
  {
    id: "appointment-booking",
    name: "Appointment Booking",
    description:
      "Clinic or service-based appointment scheduling with reminders and FAQ.",
    icon: Stethoscope,
    color: "bg-blue-100 text-blue-700",
    channels: ["whatsapp", "sms", "instagram"],
    features: ["Availability check", "Booking confirmation", "Reminders", "Cancellation", "AI FAQ"],
  },
  {
    id: "ecommerce-support",
    name: "E-commerce Support",
    description:
      "Customer support bot for online stores with order tracking, returns, and recommendations.",
    icon: ShoppingCart,
    color: "bg-green-100 text-green-700",
    channels: ["whatsapp", "instagram"],
    features: ["Order status", "Return requests", "Product recommendations", "FAQ", "Human handoff"],
  },
  {
    id: "lead-qualification",
    name: "Lead Qualification",
    description:
      "Capture lead information, score leads, and route qualified prospects to sales.",
    icon: UserCheck,
    color: "bg-purple-100 text-purple-700",
    channels: ["whatsapp", "sms", "instagram"],
    features: ["Info capture", "Lead scoring", "Sales routing", "Follow-up sequences", "CRM sync"],
  },
  {
    id: "event-rsvp",
    name: "Event RSVP",
    description:
      "Event registration and RSVP management with reminders and attendee tracking.",
    icon: Calendar,
    color: "bg-pink-100 text-pink-700",
    channels: ["whatsapp", "sms"],
    features: ["RSVP collection", "Event details", "Reminders", "Attendee management", "Check-in"],
  },
];

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<typeof templates[0] | null>(null);
  const [selectedBotId, setSelectedBotId] = useState("");
  const [deploying, setDeploying] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function deployTemplate() {
    if (!selectedTemplate || !selectedBotId) return;
    setDeploying(true);

    try {
      // Fetch the template JSON
      const response = await fetch(`/api/templates/${selectedTemplate.id}`);
      const templateData = await response.json();

      // Create a flow from the template
      await supabase.from("flows").insert({
        bot_id: selectedBotId,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        flow_data: templateData.flow_data,
        trigger_type: "message",
        trigger_config: templateData.trigger_config || {},
        is_active: true,
      });

      // If template has knowledge base entries, insert them
      if (templateData.knowledge_base) {
        await supabase.from("knowledge_base").insert(
          templateData.knowledge_base.map((kb: { title: string; content: string; category: string }) => ({
            bot_id: selectedBotId,
            title: kb.title,
            content: kb.content,
            category: kb.category,
          }))
        );
      }

      setSelectedTemplate(null);
      router.push(`/builder?bot=${selectedBotId}`);
    } catch (error) {
      console.error("Failed to deploy template:", error);
    }

    setDeploying(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Templates</h1>
        <p className="text-muted-foreground">
          Start with a pre-built bot template and customize it for your business
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader>
              <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg ${template.color}`}>
                <template.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-3 flex flex-wrap gap-1">
                {template.channels.map((ch) => (
                  <Badge key={ch} variant="outline" className="text-xs capitalize">
                    {ch}
                  </Badge>
                ))}
              </div>
              <ul className="space-y-1">
                {template.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => setSelectedTemplate(template)}
              >
                Use Template <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Choose which bot to add this template flow to
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Select Bot</Label>
            <Select value={selectedBotId} onValueChange={setSelectedBotId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose a bot..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Create new bot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={deployTemplate} disabled={!selectedBotId || deploying}>
              {deploying ? "Deploying..." : "Deploy Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
