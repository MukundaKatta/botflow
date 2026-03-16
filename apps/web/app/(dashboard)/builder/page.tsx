"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Node, Edge } from "@xyflow/react";
import { FlowCanvas } from "@/components/builder/flow-canvas";
import { NodePalette } from "@/components/builder/node-palette";
import { NodeEditor } from "@/components/builder/node-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Play, Undo2, Redo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Flow, Bot } from "@/lib/supabase/types";

const defaultNodes: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 250, y: 50 },
    data: {
      label: "Message Received",
      description: "When a new message arrives",
      config: { triggerType: "message" },
    },
  },
];

export default function BuilderPage() {
  const searchParams = useSearchParams();
  const botId = searchParams.get("bot");
  const flowId = searchParams.get("flow");

  const [bots, setBots] = useState<Bot[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedBotId, setSelectedBotId] = useState(botId || "");
  const [selectedFlowId, setSelectedFlowId] = useState(flowId || "");
  const [flowName, setFlowName] = useState("New Flow");
  const [nodes, setNodes] = useState<Node[]>(defaultNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadBots();
  }, []);

  useEffect(() => {
    if (selectedBotId) loadFlows(selectedBotId);
  }, [selectedBotId]);

  useEffect(() => {
    if (selectedFlowId) loadFlow(selectedFlowId);
  }, [selectedFlowId]);

  async function loadBots() {
    const { data } = await supabase.from("bots").select("*").order("name");
    setBots(data || []);
    if (data?.length && !selectedBotId) {
      setSelectedBotId(data[0].id);
    }
  }

  async function loadFlows(botId: string) {
    const { data } = await supabase
      .from("flows")
      .select("*")
      .eq("bot_id", botId)
      .order("name");
    setFlows(data || []);
  }

  async function loadFlow(flowId: string) {
    const { data } = await supabase
      .from("flows")
      .select("*")
      .eq("id", flowId)
      .single();
    if (data) {
      setFlowName(data.name);
      const flowData = data.flow_data as { nodes?: Node[]; edges?: Edge[] };
      setNodes(flowData?.nodes || defaultNodes);
      setEdges(flowData?.edges || []);
    }
  }

  async function saveFlow() {
    setSaving(true);
    const flowData = { nodes, edges };

    if (selectedFlowId) {
      await supabase
        .from("flows")
        .update({
          name: flowName,
          flow_data: flowData,
          version: flows.find((f) => f.id === selectedFlowId)!.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedFlowId);
    } else if (selectedBotId) {
      const { data } = await supabase
        .from("flows")
        .insert({
          bot_id: selectedBotId,
          name: flowName,
          flow_data: flowData,
          trigger_type: "message",
          trigger_config: {},
        })
        .select()
        .single();
      if (data) {
        setSelectedFlowId(data.id);
        loadFlows(selectedBotId);
      }
    }
    setSaving(false);
  }

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );
    },
    []
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col -m-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b bg-card px-4 py-2">
        <Select value={selectedBotId} onValueChange={setSelectedBotId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Bot" />
          </SelectTrigger>
          <SelectContent>
            {bots.map((bot) => (
              <SelectItem key={bot.id} value={bot.id}>
                {bot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Flow" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">+ New Flow</SelectItem>
            {flows.map((flow) => (
              <SelectItem key={flow.id} value={flow.id}>
                {flow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          className="w-48"
          placeholder="Flow name"
        />

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Play className="mr-2 h-4 w-4" /> Test
          </Button>
          <Button size="sm" onClick={saveFlow} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <div className="flex-1">
          <FlowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onNodeSelect={setSelectedNode}
          />
        </div>
        {selectedNode && (
          <NodeEditor
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
