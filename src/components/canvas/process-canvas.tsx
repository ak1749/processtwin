'use client';

import { useCallback, useEffect, useMemo } from 'react';
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
import type { BusinessProcess, ProcessConnection, ProcessStep } from '../../types/process';
import { processNodeTypes, type ProcessFlowNode } from './process-node';

export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | null;

interface ProcessCanvasProps {
  process: BusinessProcess;
  onSelectionChange: (selection: Selection) => void;
  runHumanAction: (action: () => void, operation: PolicyOperation) => void;
}

function toFlowNodes(steps: ProcessStep[]): ProcessFlowNode[] {
  return steps.map((step) => ({
    id: step.id,
    type: step.type,
    position: step.position,
    data: { step },
  }));
}

function toFlowEdges(connections: ProcessConnection[]): Edge[] {
  return connections.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    label: connection.label,
    animated: connection.createdBy === 'agent',
    style: { stroke: connection.createdBy === 'agent' ? '#38bdf8' : '#64748b', strokeWidth: 1.5 },
    labelStyle: { fill: '#475569', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
    labelBgPadding: [4, 2],
  }));
}

export function ProcessCanvas({ process, onSelectionChange, runHumanAction }: ProcessCanvasProps) {
  const [nodes, setNodes] = useNodesState<ProcessFlowNode>(toFlowNodes(process.nodes));
  const [edges, setEdges] = useEdgesState(toFlowEdges(process.edges));

  useEffect(() => setNodes(toFlowNodes(process.nodes)), [process.nodes, setNodes]);
  useEffect(() => setEdges(toFlowEdges(process.edges)), [process.edges, setEdges]);

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
            updateStep({ actor: 'human' }, { id: step.id, changes: { position } });
          },
          { kind: 'update_step', stepId: step.id, changes: { position } },
        );
      }
    },
    [process.nodes, runHumanAction, setNodes],
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
          connectSteps({ actor: 'human' }, candidate);
        },
        { kind: 'connect_steps', connection: candidate },
      );
    },
    [runHumanAction],
  );

  const onNodesDelete = useCallback(
    (deleted: ProcessFlowNode[]) => {
      for (const node of deleted) {
        runHumanAction(
          () => {
            deleteStep({ actor: 'human' }, { id: node.id, confirm: true });
          },
          { kind: 'delete_step', stepId: node.id },
        );
      }
    },
    [runHumanAction],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const edge of deleted) {
        runHumanAction(
          () => {
            deleteConnection({ actor: 'human' }, { id: edge.id });
          },
          { kind: 'delete_connection', connectionId: edge.id },
        );
      }
    },
    [runHumanAction],
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
        deleteKeyCode="Delete"
        minZoom={0.2}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        className="bg-slate-50"
      >
        <Background gap={20} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} className="!border-slate-200 !shadow-sm" />
      </ReactFlow>
    </div>
  );
}
