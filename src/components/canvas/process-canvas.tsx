'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nanoid } from 'nanoid';

import { connectSteps } from '../../domain/commands/connect-steps';
import { deleteConnection } from '../../domain/commands/delete-connection';
import { deleteStep } from '../../domain/commands/delete-step';
import { updateStep } from '../../domain/commands/update-step';
import type { PolicyOperation } from '../../domain/policies';
import { useProcessStore } from '../../stores/process-store';
import type { BusinessProcess, ProcessConnection } from '../../types/process';
import { processNodeTypes, type ProcessFlowNode } from './process-node';

export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | null;

interface ProcessCanvasProps {
  process: BusinessProcess;
  scenarioId?: string;
  onSelectionChange: (selection: Selection) => void;
  runHumanAction: (action: () => void, operation: PolicyOperation) => void;
}

function toFlowNodes(process: BusinessProcess, agentEditedNodeIds = new Set<string>()): ProcessFlowNode[] {
  const policyLabels = new Map<string, string[]>();
  for (const policy of process.policies) {
    const stepId = policy.rule.kind === 'require_step_on_path' ? undefined : policy.rule.stepId;
    if (stepId) policyLabels.set(stepId, [...(policyLabels.get(stepId) ?? []), policy.label]);
  }
  return process.nodes.map((step) => ({
    id: step.id,
    type: step.type,
    position: step.position,
    data: { step, policyLabels: policyLabels.get(step.id) ?? [], agentEdited: agentEditedNodeIds.has(step.id) },
  }));
}

function toFlowEdges(connections: ProcessConnection[]): Edge[] {
  return connections.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    label: connection.label,
    style: { stroke: connection.createdBy === 'agent' ? '#38bdf8' : '#64748b', strokeWidth: 1.5 },
    labelStyle: { fill: '#475569', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
    labelBgPadding: [4, 2],
  }));
}

export function ProcessCanvas({ process, scenarioId, onSelectionChange, runHumanAction }: ProcessCanvasProps) {
  const [nodes, setNodes] = useNodesState<ProcessFlowNode>(toFlowNodes(process));
  const [edges, setEdges] = useEdgesState(toFlowEdges(process.edges));
  const [agentEditedNodeIds, setAgentEditedNodeIds] = useState<Set<string>>(() => new Set());
  const deltaLog = useProcessStore((state) => state.deltaLog);
  const hasSeenDeltaLog = useRef(false);

  useEffect(() => setNodes(toFlowNodes(process, agentEditedNodeIds)), [agentEditedNodeIds, process, setNodes]);
  useEffect(() => setEdges(toFlowEdges(process.edges)), [process.edges, setEdges]);

  useEffect(() => {
    const latestChange = deltaLog.at(-1);
    if (!hasSeenDeltaLog.current) {
      hasSeenDeltaLog.current = true;
      return;
    }
    if (!latestChange || latestChange.actor !== 'agent') return;

    const changedNodeIds = latestChange.entityIds.filter((id) => process.nodes.some((step) => step.id === id));
    if (changedNodeIds.length === 0) return;
    setAgentEditedNodeIds(new Set(changedNodeIds));
    const timer = window.setTimeout(() => setAgentEditedNodeIds(new Set()), 250);
    return () => window.clearTimeout(timer);
  }, [deltaLog, process.nodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<ProcessFlowNode>[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
      for (const change of changes) {
        if (change.type !== 'position' || change.dragging || !change.position) continue;
        const step = process.nodes.find((node) => node.id === change.id);
        if (!step) continue;
        const position = change.position;
        runHumanAction(
          () => {
            updateStep({ actor: 'human', scenarioId }, { id: step.id, changes: { position } });
          },
          { kind: 'update_step', stepId: step.id, changes: { position } },
        );
      }
    },
    [process.nodes, runHumanAction, scenarioId, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((current) => applyEdgeChanges(changes, current)),
    [setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const id = nanoid();
      const candidate: ProcessConnection = {
        id,
        source: connection.source,
        target: connection.target,
        createdBy: 'human',
      };
      runHumanAction(
        () => {
          connectSteps({ actor: 'human', scenarioId }, candidate);
        },
        { kind: 'connect_steps', connection: candidate },
      );
    },
    [runHumanAction, scenarioId],
  );

  const onNodesDelete = useCallback(
    (deleted: ProcessFlowNode[]) => {
      for (const node of deleted) {
        runHumanAction(
          () => {
            deleteStep({ actor: 'human', scenarioId }, { id: node.id, confirm: true });
          },
          { kind: 'delete_step', stepId: node.id },
        );
      }
    },
    [runHumanAction, scenarioId],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const edge of deleted) {
        runHumanAction(
          () => {
            deleteConnection({ actor: 'human', scenarioId }, { id: edge.id });
          },
          { kind: 'delete_connection', connectionId: edge.id },
        );
      }
    },
    [runHumanAction, scenarioId],
  );

  const nodeTypes = useMemo(() => processNodeTypes, []);

  return (
    <div className="h-full min-h-0 min-w-0 overflow-hidden bg-slate-50" aria-label="Process canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={(_, node) => onSelectionChange({ kind: 'node', id: node.id })}
        onEdgeClick={(_, edge) => onSelectionChange({ kind: 'edge', id: edge.id })}
        onPaneClick={() => onSelectionChange(null)}
        fitView
        fitViewOptions={{ padding: 0.06, maxZoom: 1 }}
        deleteKeyCode="Delete"
        minZoom={0.2}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        className="bg-slate-50"
      >
        <Background gap={20} size={1} color="#d8e0ea" />
        <Controls showInteractive={false} className="!overflow-hidden !rounded-lg !border-slate-200 !shadow-[0_3px_10px_rgb(15_23_42/0.10)]" />
      </ReactFlow>
    </div>
  );
}
