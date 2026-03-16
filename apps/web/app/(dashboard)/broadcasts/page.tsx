"use client";

import { useEffect, useState } from "react";
import { Plus, Send, Calendar, MoreHorizontal, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Broadcast, Bot } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bot_id: "",
    channel: "whatsapp" as "whatsapp" | "sms" | "instagram",
    content: "",
    template_name: "",
    scheduled_at: "",
  });
  const supabase = createClient();

  useEffect(() => {
    loadBots();
    loadBroadcasts();
  }, []);

  async function loadBots() {
    const { data } = await supabase.from("bots").select("*").order("name");
    setBots(data || []);
  }

  async function loadBroadcasts() {
    setLoading(true);
    const { data } = await supabase
      .from("broadcasts")
      .select("*")
      .order("created_at", { ascending: false });
    setBroadcasts(data || []);
    setLoading(false);
  }

  async function createBroadcast() {
    if (!form.name || !form.bot_id || !form.content) return;

    await supabase.from("broadcasts").insert({
      bot_id: form.bot_id,
      name: form.name,
      channel: form.channel,
      content: form.content,
      template_name: form.template_name || null,
      scheduled_at: form.scheduled_at || null,
      status: form.scheduled_at ? "scheduled" : "draft",
      audience_filter: {},
    });

    setCreateOpen(false);
    setForm({
      name: "",
      bot_id: "",
      channel: "whatsapp",
      content: "",
      template_name: "",
      scheduled_at: "",
    });
    loadBroadcasts();
  }

  async function sendBroadcast(id: string) {
    await supabase
      .from("broadcasts")
      .update({ status: "sending" })
      .eq("id", id);
    loadBroadcasts();
  }

  async function deleteBroadcast(id: string) {
    await supabase.from("broadcasts").delete().eq("id", id);
    loadBroadcasts();
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    sending: "bg-yellow-100 text-yellow-700",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Broadcasts</h1>
          <p className="text-muted-foreground">
            Send bulk messages to your contacts
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Broadcast</DialogTitle>
              <DialogDescription>
                Send a message to multiple contacts at once
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Holiday Promo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bot</Label>
                  <Select
                    value={form.bot_id}
                    onValueChange={(v) => setForm({ ...form, bot_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bot" />
                    </SelectTrigger>
                    <SelectContent>
                      {bots.map((bot) => (
                        <SelectItem key={bot.id} value={bot.id}>
                          {bot.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select
                    value={form.channel}
                    onValueChange={(v) =>
                      setForm({ ...form, channel: v as "whatsapp" | "sms" | "instagram" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.channel === "whatsapp" && (
                <div className="space-y-2">
                  <Label>Template Name (for WhatsApp)</Label>
                  <Input
                    value={form.template_name}
                    onChange={(e) =>
                      setForm({ ...form, template_name: e.target.value })
                    }
                    placeholder="Approved template name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={4}
                  placeholder="Use {{name}} for personalization"
                />
              </div>
              <div className="space-y-2">
                <Label>Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) =>
                    setForm({ ...form, scheduled_at: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createBroadcast}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {broadcasts.length === 0 && !loading ? (
        <Card className="flex flex-col items-center py-16">
          <Megaphone className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No broadcasts yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first broadcast campaign
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{broadcast.name}</h3>
                      <Badge
                        variant="secondary"
                        className={statusColors[broadcast.status]}
                      >
                        {broadcast.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-xs">
                        {broadcast.channel}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {broadcast.content}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>Sent: {broadcast.sent_count}</span>
                      <span>Delivered: {broadcast.delivered_count}</span>
                      <span>Read: {broadcast.read_count}</span>
                      <span>Failed: {broadcast.failed_count}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {broadcast.scheduled_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(broadcast.scheduled_at).toLocaleString()}
                    </div>
                  )}
                  {broadcast.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => sendBroadcast(broadcast.id)}
                    >
                      <Send className="mr-2 h-3 w-3" /> Send Now
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteBroadcast(broadcast.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
