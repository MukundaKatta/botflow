"use client";

import { useCallback } from "react";
import type { Node } from "@xyflow/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeEditor({ node, onUpdate, onClose }: NodeEditorProps) {
  if (!node) return null;

  const data = node.data as Record<string, unknown>;

  const updateField = useCallback(
    (field: string, value: unknown) => {
      onUpdate(node.id, { ...data, [field]: value });
    },
    [node.id, data, onUpdate]
  );

  const updateConfig = useCallback(
    (field: string, value: unknown) => {
      const config = (data.config as Record<string, unknown>) || {};
      onUpdate(node.id, { ...data, config: { ...config, [field]: value } });
    },
    [node.id, data, onUpdate]
  );

  const config = (data.config as Record<string, unknown>) || {};

  return (
    <div className="w-80 border-l bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Edit Node</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={(data.label as string) || ""}
            onChange={(e) => updateField("label", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={(data.description as string) || ""}
            onChange={(e) => updateField("description", e.target.value)}
            rows={2}
          />
        </div>

        <Separator />

        {node.type === "trigger" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select
                value={(config.triggerType as string) || "message"}
                onValueChange={(v) => updateConfig("triggerType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Any Message</SelectItem>
                  <SelectItem value="keyword">Keyword Match</SelectItem>
                  <SelectItem value="button">Button Click</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.triggerType === "keyword" && (
              <div className="space-y-2">
                <Label>Keywords (comma separated)</Label>
                <Input
                  value={(config.keywords as string) || ""}
                  onChange={(e) => updateConfig("keywords", e.target.value)}
                  placeholder="hello, hi, start"
                />
              </div>
            )}
          </div>
        )}

        {node.type === "message" && (
          <div className="space-y-2">
            <Label>Message Text</Label>
            <Textarea
              value={(config.messageText as string) || ""}
              onChange={(e) => updateConfig("messageText", e.target.value)}
              rows={4}
              placeholder="Use {{name}} for contact name, {{input}} for last message"
            />
          </div>
        )}

        {node.type === "ai_response" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>System Prompt Override</Label>
              <Textarea
                value={(config.systemPrompt as string) || ""}
                onChange={(e) => updateConfig("systemPrompt", e.target.value)}
                rows={4}
                placeholder="Leave blank to use bot default"
              />
            </div>
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={(config.temperature as number) ?? 0.7}
                onChange={(e) =>
                  updateConfig("temperature", parseFloat(e.target.value))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Use Knowledge Base</Label>
              <Switch
                checked={(config.useKnowledgeBase as boolean) ?? true}
                onCheckedChange={(v) => updateConfig("useKnowledgeBase", v)}
              />
            </div>
          </div>
        )}

        {node.type === "condition" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Condition Type</Label>
              <Select
                value={(config.conditionType as string) || "contains"}
                onValueChange={(v) => updateConfig("conditionType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Message Contains</SelectItem>
                  <SelectItem value="equals">Message Equals</SelectItem>
                  <SelectItem value="regex">Regex Match</SelectItem>
                  <SelectItem value="contact_tag">Contact Has Tag</SelectItem>
                  <SelectItem value="time">Time of Day</SelectItem>
                  <SelectItem value="custom">Custom Expression</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={(config.value as string) || ""}
                onChange={(e) => updateConfig("value", e.target.value)}
                placeholder="Enter condition value"
              />
            </div>
          </div>
        )}

        {node.type === "action" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select
                value={(config.actionType as string) || "add_tag"}
                onValueChange={(v) => updateConfig("actionType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add_tag">Add Tag</SelectItem>
                  <SelectItem value="remove_tag">Remove Tag</SelectItem>
                  <SelectItem value="update_contact">Update Contact</SelectItem>
                  <SelectItem value="handoff">Human Handoff</SelectItem>
                  <SelectItem value="close_conversation">Close Conversation</SelectItem>
                  <SelectItem value="notify">Send Notification</SelectItem>
                  <SelectItem value="webhook">Call Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action Value</Label>
              <Input
                value={(config.actionValue as string) || ""}
                onChange={(e) => updateConfig("actionValue", e.target.value)}
                placeholder="e.g., tag name, email, URL"
              />
            </div>
          </div>
        )}

        {node.type === "delay" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                type="number"
                min={1}
                value={(config.duration as number) || 5}
                onChange={(e) =>
                  updateConfig("duration", parseInt(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={(config.unit as string) || "minutes"}
                onValueChange={(v) => updateConfig("unit", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {node.type === "http_request" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={(config.method as string) || "GET"}
                onValueChange={(v) => updateConfig("method", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={(config.url as string) || ""}
                onChange={(e) => updateConfig("url", e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div className="space-y-2">
              <Label>Headers (JSON)</Label>
              <Textarea
                value={(config.headers as string) || "{}"}
                onChange={(e) => updateConfig("headers", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Textarea
                value={(config.body as string) || ""}
                onChange={(e) => updateConfig("body", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {node.type === "template" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={(config.templateName as string) || ""}
                onChange={(e) => updateConfig("templateName", e.target.value)}
                placeholder="WhatsApp approved template name"
              />
            </div>
            <div className="space-y-2">
              <Label>Variables (JSON array)</Label>
              <Textarea
                value={(config.variables as string) || "[]"}
                onChange={(e) => updateConfig("variables", e.target.value)}
                rows={3}
                placeholder='["{{name}}", "{{date}}"]'
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
