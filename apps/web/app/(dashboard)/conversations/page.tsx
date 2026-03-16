"use client";

import { useEffect, useState, useRef } from "react";
import { Send, User, Bot, Phone, MessageSquare, Instagram, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn, formatRelativeTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message, Contact } from "@/lib/supabase/types";

interface ConversationWithContact extends Conversation {
  contacts: Contact;
  latest_message?: string;
}

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-3 w-3 text-green-600" />,
  sms: <Phone className="h-3 w-3 text-blue-600" />,
  instagram: <Instagram className="h-3 w-3 text-pink-600" />,
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationWithContact[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<ConversationWithContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadConversations();

    // Subscribe to realtime message updates
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (selectedConvo && msg.conversation_id === selectedConvo.id) {
            setMessages((prev) => [...prev, msg]);
          }
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo.id);
    }
  }, [selectedConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("*, contacts(*)")
      .order("last_message_at", { ascending: false });
    setConversations((data as ConversationWithContact[]) || []);
    setLoading(false);
  }

  async function loadMessages(conversationId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConvo) return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConvo.id,
      direction: "outbound",
      content: newMessage,
      content_type: "text",
      status: "pending",
    });

    if (!error) {
      setNewMessage("");
      // The realtime subscription will pick up the new message
    }
  }

  async function handleHandoff(convoId: string) {
    await supabase
      .from("conversations")
      .update({ status: "handed_off" })
      .eq("id", convoId);
    loadConversations();
  }

  async function closeConversation(convoId: string) {
    await supabase
      .from("conversations")
      .update({ status: "closed" })
      .eq("id", convoId);
    loadConversations();
  }

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const contactName = c.contacts?.name || "";
    const contactPhone = c.contacts?.phone || "";
    return (
      contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contactPhone.includes(searchQuery)
    );
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6">
      {/* Conversation list */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredConversations.map((convo) => (
            <div
              key={convo.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 border-b p-4 hover:bg-accent transition-colors",
                selectedConvo?.id === convo.id && "bg-accent"
              )}
              onClick={() => setSelectedConvo(convo)}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback>
                  {(convo.contacts?.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium">
                    {convo.contacts?.name || convo.contacts?.phone || "Unknown"}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(convo.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {channelIcons[convo.channel]}
                  <Badge
                    variant={convo.status === "active" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {convo.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Message area */}
      {selectedConvo ? (
        <div className="flex flex-1 flex-col">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b px-6 py-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {(selectedConvo.contacts?.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {selectedConvo.contacts?.name || selectedConvo.contacts?.phone}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {channelIcons[selectedConvo.channel]}
                  <span className="capitalize">{selectedConvo.channel}</span>
                  {selectedConvo.contacts?.phone && (
                    <>
                      <span>-</span>
                      <span>{selectedConvo.contacts.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedConvo.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleHandoff(selectedConvo.id)}
                >
                  Take Over
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeConversation(selectedConvo.id)}
              >
                Close
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.direction === "outbound" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.direction === "inbound" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-md rounded-lg px-4 py-2 text-sm",
                      msg.direction === "outbound"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p>{msg.content}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        msg.direction === "outbound"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {new Date(msg.created_at).toLocaleTimeString()}
                      {msg.direction === "outbound" && (
                        <span className="ml-2">{msg.status}</span>
                      )}
                    </p>
                  </div>
                  {msg.direction === "outbound" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="mx-auto mb-4 h-12 w-12" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a conversation from the list to view messages</p>
          </div>
        </div>
      )}
    </div>
  );
}
