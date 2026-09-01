'use client';

import { BadgeCheck, ChevronLeft, ChevronRight, CircleDotDashed, Flag, GitBranch, Play, Plus } from 'lucide-react';

import { createStep } from '../../domain/commands/create-step';
import type { PolicyOperation } from '../../domain/policies';
import type { ProcessStep, StepType } from '../../types/process';

interface StepPaletteProps {
  collapsed: boolean;
  nodeCount: number;
  onToggle: () => void;
  scenarioId?: string;
  runHumanAction: (action: () => void, operation: PolicyOperation) => void;
}

const paletteItems: Array<{ type: StepType; label: string; icon: typeof Play; description: string }> = [
  { type: 'start', label: 'Start', icon: Play, description: 'Entry point' },
  { type: 'action', label: 'Action', icon: CircleDotDashed, description: 'Work performed' },
  { type: 'decision', label: 'Decision', icon: GitBranch, description: 'Route cases' },
  { type: 'approval', label: 'Approval', icon: BadgeCheck, description: 'Human review' },
  { type: 'end', label: 'End', icon: Flag, description: 'Exit point' },
];

const paletteTone: Record<StepType, string> = {
  start: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  action: 'bg-blue-50 text-blue-700 ring-blue-100',
  decision: 'bg-amber-50 text-amber-700 ring-amber-100',
  approval: 'bg-violet-50 text-violet-700 ring-violet-100',
  end: 'bg-slate-900 text-white ring-slate-900',
};

function initialStep(type: StepType, index: number): Omit<ProcessStep, 'id' | 'createdBy' | 'updatedAt'> {
  const nameByType: Record<StepType, string> = {
    start: 'Start',
    action: 'New action',
    decision: 'New decision',
    approval: 'New approval',
    end: 'End',
  };
  const zeroDuration = { minMinutes: 0, typicalMinutes: 0, maxMinutes: 0 };
  const workDuration = { minMinutes: 5, typicalMinutes: 15, maxMinutes: 30 };

  return {
    type,
    name: nameByType[type],
    duration: type === 'action' || type === 'approval' ? workDuration : zeroDuration,
    position: { x: 80 + (index % 3) * 48, y: 80 + (index % 4) * 48 },
  };
}

export function StepPalette({ collapsed, nodeCount, onToggle, scenarioId, runHumanAction }: StepPaletteProps) {
  function addStep(type: StepType) {
    const step = initialStep(type, nodeCount);
    const operationStep: ProcessStep = {
      ...step,
      id: `preview-${type}-${nodeCount}`,
      createdBy: 'human',
      updatedAt: '',
    };
    runHumanAction(
      () => {
        createStep({ actor: 'human', scenarioId }, step);
      },
      { kind: 'create_step', step: operationStep },
    );
  }

  return (
    <aside className={`flex min-h-0 flex-col bg-white ${collapsed ? 'items-center p-3' : 'p-4'}`} aria-label="Step palette">
      <div className={`flex w-full ${collapsed ? 'justify-center' : 'items-start justify-between gap-3'}`}>
        {!collapsed ? <div>
          <p className="pt-section-label">Process canvas</p>
          <h2 className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-900">Add a step</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Add nodes, then connect their handles on the canvas.</p>
        </div> : null}
        <button type="button" onClick={onToggle} className="pt-subtle-control h-8 w-8 shrink-0 p-0" aria-label={collapsed ? 'Expand step palette' : 'Collapse step palette'} title={collapsed ? 'Expand step palette' : 'Collapse step palette'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <div className={`${collapsed ? 'mt-5 space-y-2' : 'mt-5 space-y-1.5'}`}>
        {paletteItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => addStep(item.type)}
              className={`flex w-full items-center rounded-xl border border-transparent text-left transition duration-200 hover:border-slate-200 hover:bg-slate-50 active:translate-y-px ${collapsed ? 'h-10 justify-center' : 'gap-3 px-3 py-2.5'}`}
              aria-label={`Add ${item.label} step`}
              title={collapsed ? `Add ${item.label} step` : undefined}
            >
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${paletteTone[item.type]}`}>
                <Icon size={15} />
              </span>
              {!collapsed ? <><span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                <span className="block text-xs text-slate-500">{item.description}</span>
              </span>
              <Plus size={15} className="text-slate-400" aria-hidden="true" /></> : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
