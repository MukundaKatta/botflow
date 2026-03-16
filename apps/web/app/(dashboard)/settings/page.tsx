"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioWhatsapp, setTwilioWhatsapp] = useState("");
  const [twilioSms, setTwilioSms] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: orgData } = await supabase
      .from("organization_members")
      .select("organization_id, organizations(*)")
      .limit(1)
      .single();

    if (orgData?.organizations) {
      const org = orgData.organizations as { name: string };
      setOrgName(org.name || "");
    }
  }

  async function saveGeneralSettings() {
    setSaving(true);
    const { data: orgData } = await supabase
      .from("organization_members")
      .select("organization_id")
      .limit(1)
      .single();

    if (orgData) {
      await supabase
        .from("organizations")
        .update({ name: orgName })
        .eq("id", orgData.organization_id);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization and integration settings
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                General settings for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <Button onClick={saveGeneralSettings} disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook URLs</CardTitle>
              <CardDescription>
                Configure these URLs in your provider dashboards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Twilio Webhook URL</Label>
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/twilio`}
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram Webhook URL</Label>
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/instagram`}
                />
              </div>
              <div className="space-y-2">
                <Label>Stripe Webhook URL</Label>
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/stripe`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Twilio (WhatsApp & SMS)</CardTitle>
              <CardDescription>
                Configure your Twilio credentials for WhatsApp and SMS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Account SID</Label>
                <Input
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                  placeholder="ACxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Auth Token</Label>
                <Input
                  type="password"
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                  placeholder="Your Twilio auth token"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  value={twilioWhatsapp}
                  onChange={(e) => setTwilioWhatsapp(e.target.value)}
                  placeholder="whatsapp:+14155238886"
                />
              </div>
              <div className="space-y-2">
                <Label>SMS Number</Label>
                <Input
                  value={twilioSms}
                  onChange={(e) => setTwilioSms(e.target.value)}
                  placeholder="+14155238886"
                />
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" /> Save Twilio Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instagram / Meta</CardTitle>
              <CardDescription>
                Configure Instagram Graph API for DM automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meta Access Token</Label>
                <Input
                  type="password"
                  value={instagramToken}
                  onChange={(e) => setInstagramToken(e.target.value)}
                  placeholder="Your Meta access token"
                />
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" /> Save Instagram Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anthropic Claude</CardTitle>
              <CardDescription>
                Configure the AI model used for generating responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-xxxxx"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-respond with AI</Label>
                  <p className="text-xs text-muted-foreground">
                    Let AI respond automatically when no flow matches
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" /> Save AI Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className="text-lg px-3 py-1">Free</Badge>
                <div>
                  <p className="text-sm">500 messages / month</p>
                  <p className="text-xs text-muted-foreground">1 bot, 1 channel</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { name: "Starter", price: "$29/mo", messages: "5,000", bots: "3" },
                  { name: "Pro", price: "$99/mo", messages: "25,000", bots: "10" },
                  { name: "Enterprise", price: "Custom", messages: "Unlimited", bots: "Unlimited" },
                ].map((plan) => (
                  <Card key={plan.name}>
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-2xl font-bold">
                        {plan.price}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>{plan.messages} messages/month</li>
                        <li>{plan.bots} bots</li>
                        <li>All channels</li>
                        <li>Priority support</li>
                      </ul>
                      <Button className="mt-4 w-full" variant="outline">
                        Upgrade
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage who has access to your BotFlow organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">You (Owner)</p>
                    <p className="text-xs text-muted-foreground">user@example.com</p>
                  </div>
                  <Badge>Owner</Badge>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Input placeholder="Email address" className="flex-1" />
                  <Button>Invite</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
