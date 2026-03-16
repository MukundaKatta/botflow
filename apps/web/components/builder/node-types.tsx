"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  MessageSquare,
  Sparkles,
  GitBranch,
  Zap,
  Clock,
  FileText,
  Globe,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseNodeData {
  label: string;
  description?: string;
  config?: Record<string, unknown>;
}

function BaseNode({
  data,
  icon: Icon,
  color,
  selected,
  hasInput = true,
  hasOutput = true,
}: {
  data: BaseNodeData;
  icon: React.ElementType;
  color: string;
  selected?: boolean;
  hasInput?: boolean;
  hasOutput?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-card shadow-sm transition-shadow",
        selected ? "border-primary shadow-md" : "border-border"
      )}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !border-2 !border-white !bg-primary"
        />
      )}
      <div className={cn("flex items-center gap-2 rounded-t-lg px-3 py-2", color)}>
        <Icon className="h-4 w-4 text-white" />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      {data.description && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {data.description}
        </div>
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !border-2 !border-white !bg-primary"
        />
      )}
    </div>
  );
}

export const TriggerNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode
    data={data as BaseNodeData}
    icon={Play}
    color="bg-emerald-600"
    selected={selected}
    hasInput={false}
  />
));
TriggerNode.displayName = "TriggerNode";

export const AIResponseNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode
    data={data as BaseNodeData}
    icon={Sparkles}
    color="bg-violet-600"
    selected={selected}
  />
));
AIResponseNode.displayName = "AIResponseNode";

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as BaseNodeData;
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border-2 bg-card shadow-sm",
        selected ? "border-primary shadow-md" : "border-border"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !bg-primary"
      />
      <div className="flex items-center gap-2 rounded-t-lg bg-amber-600 px-3 py-2">
        <GitBranch className="h-4 w-4 text-white" />
        <span className="text-sm font-medium text-white">{d.label}</span>
      </div>
      {d.description && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {d.description}
        </div>
      )}
      <div className="flex justify-between px-3 pb-2">
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            className="!h-3 !w-3 !border-2 !border-white !bg-green-500"
            style={{ left: "30%" }}
          />
          <span className="text-[10px] text-green-600">Yes</span>
        </div>
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            className="!h-3 !w-3 !border-2 !border-white !bg-red-500"
            style={{ left: "70%" }}
          />
          <span className="text-[10px] text-red-600">No</span>
        </div>
      </div>
    </div>
  );
});
ConditionNode.displayName = "ConditionNode";

export const ActionNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode
    data={data as BaseNodeData}
    icon={Zap}
    color="bg-blue-600"
    selected={selected}
  />
));
ActionNode.displayName = "ActionNode";

export const DelayNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode
    data={data as BaseNodeData}
    icon={Clock}
    color="bg-orange-600"
    selected={selected}
  />
));
DelayNode.displayName = "DelayNode";

export const TemplateNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode
    data={data as BaseNodeData}
    icon={FileText}
    color="bg-teal-600"
    selected={selected}
  />
));
TemplateNode.displayName = "TemplateNode";

export const HTTPRequestNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode
    data={data as BaseNodeData}
    icon={Globe}
    color="bg-slate-600"
    selected={selected}
  />
));
HTTPRequestNode.displayName = "HTTPRequestNode";

export const MessageNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode
    data={data as BaseNodeData}
    icon={MessageSquare}
    color="bg-sky-600"
    selected={selected}
  />
));
MessageNode.displayName = "MessageNode";

export const nodeTypes = {
  trigger: TriggerNode,
  ai_response: AIResponseNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
  template: TemplateNode,
  http_request: HTTPRequestNode,
  message: MessageNode,
};
