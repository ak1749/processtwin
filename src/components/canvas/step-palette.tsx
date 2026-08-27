'use client';

import { BadgeCheck, CircleDotDashed, Flag, GitBranch, Play, Plus } from 'lucide-react';

import { createStep } from '../../domain/commands/create-step';
import type { PolicyOperation } from '../../domain/policies';
import type { ProcessStep, StepType } from '../../types/process';

interface StepPaletteProps {
  nodeCount: number;
  runHumanAction: (action: () => void, operation: PolicyOperation) => void;
}

const paletteItems: Array<{ type: StepType; label: string; icon: typeof Play; description: string }> = [
  { type: 'start', label: 'Start', icon: Play, description: 'Entry point' },
  { type: 'action', label: 'Action', icon: CircleDotDashed, description: 'Work performed' },
  { type: 'decision', label: 'Decision', icon: GitBranch, description: 'Route cases' },
  { type: 'approval', label: 'Approval', icon: BadgeCheck, description: 'Human review' },
  { type: 'end', label: 'End', icon: Flag, description: 'Exit point' },
];

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

export function StepPalette({ nodeCount, runHumanAction }: StepPaletteProps) {
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
        createStep({ actor: 'human' }, step);
      },
      { kind: 'create_step', step: operationStep },
    );
  }

  return (
    <aside className="flex min-h-0 flex-col bg-white p-4" aria-label="Step palette">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Add a step</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Place nodes, then connect their handles on the canvas.</p>
      </div>
      <div className="mt-5 space-y-2">
        {paletteItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => addStep(item.type)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50 active:translate-y-px"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                <span className="block text-xs text-slate-500">{item.description}</span>
              </span>
              <Plus size={14} className="text-slate-400" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
