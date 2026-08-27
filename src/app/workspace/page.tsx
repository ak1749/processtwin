'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutTemplate, Redo2, Sparkles, Undo2, X } from 'lucide-react';

import { ActivityFeed } from '../../components/activity/activity-feed';
import { ProcessCanvas, type Selection } from '../../components/canvas/process-canvas';
import { StepPalette } from '../../components/canvas/step-palette';
import { ProcessInspector } from '../../components/inspector/process-inspector';
import { redoProcess } from '../../domain/commands/redo-process';
import { undoProcess } from '../../domain/commands/undo-process';
import { updateStep } from '../../domain/commands/update-step';
import { autoLayout } from '../../domain/layout/auto-layout';
import { checkPolicies, type PolicyOperation, type PolicyViolation } from '../../domain/policies';
import { useProcessStore } from '../../stores/process-store';

const drawerTabs = ['Activity', 'Simulation', 'Validation', 'Agent'] as const;

interface PendingPolicyAction {
  warnings: PolicyViolation[];
  action: () => void;
}

export default function WorkspacePage() {
  const process = useProcessStore((state) => state.process);
  const past = useProcessStore((state) => state.past);
  const future = useProcessStore((state) => state.future);
  const [selection, setSelection] = useState<Selection>(null);
  const [activeTab, setActiveTab] = useState<(typeof drawerTabs)[number]>('Activity');
  const [pendingPolicyAction, setPendingPolicyAction] = useState<PendingPolicyAction | null>(null);

  const runHumanAction = useCallback(
    (action: () => void, operation: PolicyOperation) => {
      const warnings = checkPolicies(process, operation);
      if (warnings.length > 0) {
        setPendingPolicyAction({ warnings, action });
        return;
      }
      action();
    },
    [process],
  );

  const applyAutoLayout = useCallback(() => {
    const positions = autoLayout(process.nodes, process.edges);
    const operations: PolicyOperation[] = positions.map((entry) => ({ kind: 'update_step', stepId: entry.id, changes: { position: entry.position } }));
    const warnings = operations.flatMap((operation) => checkPolicies(process, operation));
    const action = () => {
      for (const entry of positions) updateStep({ actor: 'human' }, { id: entry.id, changes: { position: entry.position } });
    };
    if (warnings.length > 0) setPendingPolicyAction({ warnings, action });
    else action();
  }, [process]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select')) return;
      event.preventDefault();
      if (event.shiftKey) redoProcess({ actor: 'human' }, {});
      else undoProcess({ actor: 'human' }, {});
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="grid min-h-screen min-w-0 grid-rows-[64px_minmax(0,1fr)_190px] overflow-hidden bg-slate-50 text-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="min-w-0"><p className="text-xs font-medium text-slate-500">Workspace</p><h1 className="truncate text-base font-semibold text-slate-950">{process.name}</h1></div>
        <div className="flex items-center gap-2" aria-label="Workspace controls">
          <button type="button" onClick={() => undoProcess({ actor: 'human' }, {})} disabled={past.length === 0} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Undo last edit"><Undo2 size={15} /> Undo</button>
          <button type="button" onClick={() => redoProcess({ actor: 'human' }, {})} disabled={future.length === 0} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Redo last edit"><Redo2 size={15} /> Redo</button>
          <button type="button" onClick={applyAutoLayout} disabled={process.nodes.length === 0} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Lay out process from left to right"><LayoutTemplate size={15} /> Layout</button>
          <button type="button" disabled className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400" aria-label="Current scenario">Main process</button>
          <button type="button" disabled className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white opacity-50" aria-label="Simulation available in a later phase">Simulate</button>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[13rem_minmax(0,1fr)_20rem] gap-px bg-slate-200">
        <StepPalette nodeCount={process.nodes.length} runHumanAction={runHumanAction} />
        <section className="relative min-h-0 min-w-0 bg-slate-50" aria-label="Process canvas area">
          <ProcessCanvas process={process} onSelectionChange={setSelection} runHumanAction={runHumanAction} />
          {process.nodes.length === 0 ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="max-w-sm rounded-xl border border-slate-200 bg-white/95 px-6 py-5 text-center shadow-sm"><span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Sparkles size={17} /></span><h2 className="mt-3 text-sm font-semibold text-slate-900">Build your first process</h2><p className="mt-1 text-xs leading-5 text-slate-500">Add steps from the palette, connect them with handles, and edit each step in the inspector.</p></div></div> : null}
        </section>
        <ProcessInspector process={process} selection={selection} runHumanAction={runHumanAction} />
      </div>

      <section className="min-h-0 min-w-0 border-t border-slate-200 bg-white" aria-label="Workspace drawer">
        <div className="flex h-11 items-center gap-1 border-b border-slate-100 px-4" role="tablist" aria-label="Workspace drawer tabs">
          {drawerTabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === tab ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}>{tab}</button>)}
        </div>
        <div className="h-[calc(100%-2.75rem)]">{activeTab === 'Activity' ? <ActivityFeed /> : <p className="px-4 py-4 text-sm text-slate-500">{activeTab} is available in a later phase.</p>}</div>
      </section>

      {pendingPolicyAction ? <div role="alert" className="fixed bottom-52 right-5 z-20 w-[360px] rounded-xl border border-amber-200 bg-white p-4 shadow-lg shadow-slate-300/40"><div className="flex items-start gap-3"><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">!</span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-slate-900">Policy warning</h2><p className="mt-1 text-sm leading-5 text-slate-600">{pendingPolicyAction.warnings[0]?.message}</p></div><button type="button" onClick={() => setPendingPolicyAction(null)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss policy warning"><X size={16} /></button></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPendingPolicyAction(null)} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button><button type="button" onClick={() => { pendingPolicyAction.action(); setPendingPolicyAction(null); }} className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">Do it anyway</button></div></div> : null}
    </main>
  );
}
