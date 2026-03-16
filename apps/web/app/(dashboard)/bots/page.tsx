"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, MessageSquare, Phone, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Bot } from "@/lib/supabase/types";

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-4 w-4 text-green-600" />,
  sms: <Phone className="h-4 w-4 text-blue-600" />,
  instagram: <Instagram className="h-4 w-4 text-pink-600" />,
};

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBot, setNewBot] = useState({ name: "", description: "" });
  const supabase = createClient();

  useEffect(() => {
    loadBots();
  }, []);

  async function loadBots() {
    setLoading(true);
    const { data } = await supabase
      .from("bots")
      .select("*")
      .order("created_at", { ascending: false });
    setBots(data || []);
    setLoading(false);
  }

  async function createBot() {
    if (!newBot.name.trim()) return;

    const { data: orgData } = await supabase
      .from("organization_members")
      .select("organization_id")
      .limit(1)
      .single();

    if (!orgData) return;

    const { error } = await supabase.from("bots").insert({
      name: newBot.name,
      description: newBot.description || null,
      organization_id: orgData.organization_id,
      channels: ["whatsapp"],
    });

    if (!error) {
      setCreateOpen(false);
      setNewBot({ name: "", description: "" });
      loadBots();
    }
  }

  async function toggleBotStatus(bot: Bot) {
    const newStatus = bot.status === "active" ? "paused" : "active";
    await supabase.from("bots").update({ status: newStatus }).eq("id", bot.id);
    loadBots();
  }

  async function deleteBot(id: string) {
    await supabase.from("bots").delete().eq("id", id);
    loadBots();
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    draft: "bg-gray-100 text-gray-800",
    paused: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bots</h1>
          <p className="text-muted-foreground">
            Manage your AI-powered conversation bots
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Bot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bot</DialogTitle>
              <DialogDescription>
                Set up a new conversational bot for your business
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Customer Support Bot"
                  value={newBot.name}
                  onChange={(e) =>
                    setNewBot({ ...newBot, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this bot do?"
                  value={newBot.description}
                  onChange={(e) =>
                    setNewBot({ ...newBot, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createBot}>Create Bot</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bots.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No bots yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first bot to start automating conversations
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Bot
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{bot.name}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={statusColors[bot.status] || ""}
                  >
                    {bot.status}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/builder?bot=${bot.id}`}>
                        Edit Flows
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleBotStatus(bot)}>
                      {bot.status === "active" ? "Pause" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteBot(bot.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {bot.description && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {bot.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {bot.channels.map((ch) => (
                    <div
                      key={ch}
                      className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                    >
                      {channelIcons[ch]}
                      <span className="capitalize">{ch}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
