"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { createClient } from "@/lib/supabase/client";
import type { KnowledgeBase, Bot } from "@/lib/supabase/types";

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeBase[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeBase | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
    bot_id: "",
  });
  const supabase = createClient();

  useEffect(() => {
    loadBots();
    loadEntries();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [selectedBotId]);

  async function loadBots() {
    const { data } = await supabase.from("bots").select("*").order("name");
    setBots(data || []);
  }

  async function loadEntries() {
    setLoading(true);
    let query = supabase.from("knowledge_base").select("*").order("created_at", { ascending: false });
    if (selectedBotId !== "all") {
      query = query.eq("bot_id", selectedBotId);
    }
    const { data } = await query;
    setEntries(data || []);
    setLoading(false);
  }

  async function saveEntry() {
    if (!form.title || !form.content || !form.bot_id) return;

    if (editingEntry) {
      await supabase
        .from("knowledge_base")
        .update({
          title: form.title,
          content: form.content,
          category: form.category || null,
        })
        .eq("id", editingEntry.id);
    } else {
      await supabase.from("knowledge_base").insert({
        bot_id: form.bot_id,
        title: form.title,
        content: form.content,
        category: form.category || null,
      });
    }

    setDialogOpen(false);
    setEditingEntry(null);
    setForm({ title: "", content: "", category: "", bot_id: "" });
    loadEntries();
  }

  async function toggleActive(entry: KnowledgeBase) {
    await supabase
      .from("knowledge_base")
      .update({ is_active: !entry.is_active })
      .eq("id", entry.id);
    loadEntries();
  }

  async function deleteEntry(id: string) {
    await supabase.from("knowledge_base").delete().eq("id", id);
    loadEntries();
  }

  function openEdit(entry: KnowledgeBase) {
    setEditingEntry(entry);
    setForm({
      title: entry.title,
      content: entry.content,
      category: entry.category || "",
      bot_id: entry.bot_id,
    });
    setDialogOpen(true);
  }

  const filtered = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Add content for AI to use when generating responses
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingEntry(null);
                setForm({ title: "", content: "", category: "", bot_id: bots[0]?.id || "" });
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "Edit Entry" : "Add Knowledge Base Entry"}
              </DialogTitle>
              <DialogDescription>
                This content will be used by AI to answer questions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Bot</Label>
                <Select value={form.bot_id} onValueChange={(v) => setForm({ ...form, bot_id: v })}>
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
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Business Hours"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g., FAQ, Menu, Policies"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={8}
                  placeholder="Enter the knowledge content that the AI will use..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEntry}>
                {editingEntry ? "Update" : "Add Entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedBotId} onValueChange={setSelectedBotId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by bot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bots</SelectItem>
            {bots.map((bot) => (
              <SelectItem key={bot.id} value={bot.id}>
                {bot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && !loading ? (
        <Card className="flex flex-col items-center py-16">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No entries yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Add knowledge for your AI to reference in conversations
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                  {entry.category && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {entry.category}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={entry.is_active}
                    onCheckedChange={() => toggleActive(entry)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {entry.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
