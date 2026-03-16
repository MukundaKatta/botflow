"use client";

import {
  Play,
  Sparkles,
  GitBranch,
  Zap,
  Clock,
  FileText,
  Globe,
  MessageSquare,
} from "lucide-react";

const paletteItems = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Start of a flow",
    icon: Play,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    type: "message",
    label: "Send Message",
    description: "Send a text message",
    icon: MessageSquare,
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    type: "ai_response",
    label: "AI Response",
    description: "Claude generates a reply",
    icon: Sparkles,
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    type: "condition",
    label: "Condition",
    description: "If/else branch",
    icon: GitBranch,
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    type: "action",
    label: "Action",
    description: "Book, tag, notify, etc.",
    icon: Zap,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    type: "delay",
    label: "Delay",
    description: "Wait before continuing",
    icon: Clock,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    type: "template",
    label: "Template Message",
    description: "Send approved template",
    icon: FileText,
    color: "bg-teal-100 text-teal-700 border-teal-200",
  },
  {
    type: "http_request",
    label: "HTTP Request",
    description: "Call external API",
    icon: Globe,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

export function NodePalette() {
  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    label: string
  ) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.setData("application/reactflow-label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-64 border-r bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Node Types
      </h3>
      <div className="space-y-2">
        {paletteItems.map((item) => (
          <div
            key={item.type}
            className={`flex cursor-grab items-center gap-3 rounded-lg border p-3 transition-colors hover:shadow-sm ${item.color}`}
            draggable
            onDragStart={(e) => onDragStart(e, item.type, item.label)}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs opacity-70">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
