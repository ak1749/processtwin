import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  BadgeCheck,
  CircleDotDashed,
  Flag,
  GitBranch,
  Play,
  LockKeyhole,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import type { ProcessStep, StepType } from '../../types/process';

export type ProcessFlowNode = Node<{ step: ProcessStep; policyLabels: string[] }, StepType>;

const nodeAppearance: Record<StepType, { icon: LucideIcon; label: string; accent: string }> = {
  start: { icon: Play, label: 'Start', accent: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  action: { icon: CircleDotDashed, label: 'Action', accent: 'border-blue-300 bg-blue-50 text-blue-800' },
  decision: { icon: GitBranch, label: 'Decision', accent: 'border-amber-300 bg-amber-50 text-amber-800' },
  approval: { icon: BadgeCheck, label: 'Approval', accent: 'border-violet-300 bg-violet-50 text-violet-800' },
  end: { icon: Flag, label: 'End', accent: 'border-slate-700 bg-slate-800 text-white' },
};

function durationLabel(step: ProcessStep): string {
  if (step.type === 'start' || step.type === 'end' || step.type === 'decision') return 'Instant';
  return `${step.duration.typicalMinutes} min typical`;
}

function StepNode({ data, selected }: NodeProps<ProcessFlowNode>) {
  const { step } = data;
  const appearance = nodeAppearance[step.type];
  const Icon = appearance.icon;
  const agentCreated = step.createdBy === 'agent';
  const constrained = data.policyLabels.length > 0;

  return (
    <div
      className={`relative w-[216px] rounded-xl border bg-white px-3 py-3 shadow-sm transition-shadow ${
        selected ? 'border-slate-900 ring-2 ring-slate-300' : 'border-slate-200'
      } ${agentCreated ? 'bg-sky-50/70 ring-1 ring-sky-200' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-500" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-500" />
      {agentCreated ? (
        <span
          className="absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-600"
          title="Created by agent"
          aria-label="Created by agent"
        >
          <Sparkles size={11} strokeWidth={2} />
        </span>
      ) : null}
      {constrained ? <span className="absolute -left-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700" title={data.policyLabels.join(', ')} aria-label={`Constrained by ${data.policyLabels.join(', ')}`}><LockKeyhole size={11} /></span> : null}
      <div className="flex items-start gap-2">
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${appearance.accent}`}>
          <Icon size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{step.name}</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">{appearance.label}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
        <span className="truncate">{step.owner ?? 'Unassigned'}</span>
        <span className="shrink-0 font-medium text-slate-600">{durationLabel(step)}</span>
      </div>
    </div>
  );
}

export function StartNode(props: NodeProps<ProcessFlowNode>) {
  return <StepNode {...props} />;
}

export function ActionNode(props: NodeProps<ProcessFlowNode>) {
  return <StepNode {...props} />;
}

export function DecisionNode(props: NodeProps<ProcessFlowNode>) {
  return <StepNode {...props} />;
}

export function ApprovalNode(props: NodeProps<ProcessFlowNode>) {
  return <StepNode {...props} />;
}

export function EndNode(props: NodeProps<ProcessFlowNode>) {
  return <StepNode {...props} />;
}

export const processNodeTypes = {
  start: StartNode,
  action: ActionNode,
  decision: DecisionNode,
  approval: ApprovalNode,
  end: EndNode,
};
