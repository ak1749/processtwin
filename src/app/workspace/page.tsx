'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, LayoutTemplate, Redo2, Sparkles, Undo2, X } from 'lucide-react';

import { ActivityFeed } from '../../components/activity/activity-feed';
import { SimulationPanel } from '../../components/simulation/simulation-panel';
import { ProcessCanvas, type Selection } from '../../components/canvas/process-canvas';
import { StepPalette } from '../../components/canvas/step-palette';
import { ProcessInspector } from '../../components/inspector/process-inspector';
import { WebMcpPanel } from '../../components/webmcp-panel/webmcp-panel';
import { redoProcess } from '../../domain/commands/redo-process';
import { clearProcess } from '../../domain/commands/clear-process';
import { batchMutateProcess } from '../../domain/commands/batch-mutate-process';
import { undoProcess } from '../../domain/commands/undo-process';
import { repositionSteps } from '../../domain/commands/reposition-steps';
import { autoLayout } from '../../domain/layout/auto-layout';
import { checkPolicies, type PolicyOperation, type PolicyViolation } from '../../domain/policies';
import { useProcessStore } from '../../stores/process-store';
import { useWebMcp } from '../../hooks/use-webmcp';
import { createRefundTemplate } from '../../data/templates/refund';
import { useScenarioStore } from '../../stores/scenario-store';
import { ScenarioDiffDrawer } from '../../components/scenario/scenario-diff-drawer';

const drawerTabs = ['Activity', 'Simulation', 'Validation', 'Agent'] as const;

const demoPrompts = [
  {
    label: 'Build',
    text: 'Build a refund workflow. Every request goes through a fraud check. Fraud-flagged requests go to investigation. Clean requests under $500 are auto-approved; $500 and above need manager approval. All successful paths issue the refund before ending. Then lay it out and validate it.',
  },
  {
    label: 'Analyse',
    text: 'What has changed since you last looked? Then simulate 10,000 cases with seed 42 and tell me which step drives our P95.',
  },
  {
    label: 'Optimise',
    text: 'Propose changes that bring P95 below four hours. Refunds above $2,000 must still require human approval. Work in a scenario and show me the diff before anything changes.',
  },
] as const;

interface PendingPolicyAction {
  warnings: PolicyViolation[];
  action: () => void;
}

export default function WorkspacePage() {
  useWebMcp();
  const process = useProcessStore((state) => state.process);
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId);
  const scenarios = useScenarioStore((state) => state.scenarios);
  const setActiveScenarioId = useScenarioStore((state) => state.setActiveScenarioId);
  const past = useProcessStore((state) => state.past);
  const future = useProcessStore((state) => state.future);
  const [selection, setSelection] = useState<Selection>(null);
  const [activeTab, setActiveTab] = useState<(typeof drawerTabs)[number]>('Activity');
  const [pendingPolicyAction, setPendingPolicyAction] = useState<PendingPolicyAction | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const hasLoadedDemoTemplate = useRef(false);

  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId);
  const visibleProcess = activeScenario?.process ?? process;
  const runHumanAction = useCallback(
    (action: () => void, operation: PolicyOperation) => {
      const warnings = checkPolicies(visibleProcess, operation);
      if (warnings.length > 0) {
        setPendingPolicyAction({ warnings, action });
        return;
      }
      action();
    },
    [visibleProcess],
  );

  const applyAutoLayout = useCallback(() => {
    const operation: PolicyOperation = {
      kind: 'reposition_steps',
      positions: autoLayout(visibleProcess.nodes, visibleProcess.edges, 'LR'),
    };
    const warnings = checkPolicies(visibleProcess, operation);
    const action = () => repositionSteps(
      { actor: 'human', scenarioId: activeScenarioId ?? undefined },
      { direction: 'LR' },
    );
    if (warnings.length > 0) setPendingPolicyAction({ warnings, action });
    else action();
  }, [activeScenarioId, visibleProcess]);

  const loadRefundTemplate = useCallback(() => {
    const template = createRefundTemplate();
    clearProcess({ actor: 'human' }, {});
    batchMutateProcess({ actor: 'human' }, {
      operations: [
        ...template.nodes.map((node) => ({ kind: 'create_step' as const, step: { id: node.id, type: node.type, name: node.name, ...(node.description ? { description: node.description } : {}), ...(node.owner ? { owner: node.owner } : {}), duration: node.duration, ...(node.cost === undefined ? {} : { cost: node.cost }), ...(node.capacityPerHour === undefined ? {} : { capacityPerHour: node.capacityPerHour }), position: node.position } })),
        ...template.variables.map((variable) => ({ kind: 'set_variable' as const, variable })),
        ...template.edges.map((connection) => ({ kind: 'connect_steps' as const, connection: { id: connection.id, source: connection.source, target: connection.target, ...(connection.label ? { label: connection.label } : {}), ...(connection.condition ? { condition: connection.condition } : {}), ...(connection.probability === undefined ? {} : { probability: connection.probability }) } })),
      ],
    });
    setActiveTab('Simulation');
  }, []);

  useEffect(() => {
    if (hasLoadedDemoTemplate.current) return;
    const launchMode = new URLSearchParams(window.location.search);
    if (!launchMode.has('template') && !launchMode.has('blank')) return;
    hasLoadedDemoTemplate.current = true;
    if (launchMode.get('template') === 'refund') loadRefundTemplate();
    else clearProcess({ actor: 'human' }, {});
    window.history.replaceState({}, '', '/workspace');
  }, [loadRefundTemplate]);

  const copyPrompt = useCallback(async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPrompt(label);
    window.setTimeout(() => setCopiedPrompt(null), 1500);
  }, []);

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
          <button type="button" onClick={applyAutoLayout} disabled={visibleProcess.nodes.length === 0} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Lay out process from left to right"><LayoutTemplate size={15} /> Layout</button>
          <button type="button" onClick={() => setActiveScenarioId(null)} disabled={!activeScenario} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-400" aria-label="Switch to main process">{activeScenario ? 'View main' : 'Main process'}</button>
          <button type="button" onClick={() => setActiveTab('Simulation')} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700" aria-label="Open simulation drawer">Simulate</button>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[13rem_minmax(0,1fr)_20rem] gap-px bg-slate-200">
        <StepPalette nodeCount={visibleProcess.nodes.length} scenarioId={activeScenario?.id} runHumanAction={runHumanAction} />
        <section className={`relative min-h-0 min-w-0 bg-slate-50 ${activeScenario ? 'ring-2 ring-inset ring-violet-400' : ''}`} aria-label="Process canvas area">
          {activeScenario ? <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-violet-700 px-3 py-1.5 text-xs font-medium text-white">Scenario: {activeScenario.title} — viewing branch <button type="button" onClick={() => setActiveScenarioId(null)} className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25">View main</button></div> : null}
          <ProcessCanvas process={visibleProcess} scenarioId={activeScenario?.id} onSelectionChange={setSelection} runHumanAction={runHumanAction} />
          {visibleProcess.nodes.length === 0 ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-y-auto p-6"><section className="pointer-events-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white/95 px-6 py-5 shadow-sm" aria-labelledby="empty-state-title"><div className="text-center"><span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Sparkles size={17} /></span><h2 id="empty-state-title" className="mt-3 text-sm font-semibold text-slate-900">Build your first process</h2><p className="mt-1 text-xs leading-5 text-slate-500">Copy a demo prompt into ChatGPT or Codex to build, analyse, or optimise this process.</p></div><div className="mt-5 space-y-2">{demoPrompts.map((prompt) => <div key={prompt.label} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{prompt.label}</p><p className="mt-1 text-sm leading-5 text-slate-700">{prompt.text}</p></div><button type="button" onClick={() => void copyPrompt(prompt.label, prompt.text)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100" aria-label={`Copy ${prompt.label} prompt to clipboard`}>{copiedPrompt === prompt.label ? <Check size={14} /> : <Copy size={14} />} {copiedPrompt === prompt.label ? 'Copied' : 'Copy'}</button></div>)}</div></section></div> : null}
        </section>
        {selection ? <ProcessInspector process={visibleProcess} scenarioId={activeScenario?.id} selection={selection} runHumanAction={runHumanAction} /> : <WebMcpPanel />}
      </div>

      <section className="min-h-0 min-w-0 border-t border-slate-200 bg-white" aria-label="Workspace drawer">
        <div className="flex h-11 items-center gap-1 border-b border-slate-100 px-4" role="tablist" aria-label="Workspace drawer tabs">
          {drawerTabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === tab ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}>{tab}</button>)}
        </div>
        <div className="h-[calc(100%-2.75rem)]">{activeTab === 'Activity' ? <ActivityFeed /> : activeTab === 'Simulation' ? <SimulationPanel /> : <p className="px-4 py-4 text-sm text-slate-500">{activeTab} is available in a later phase.</p>}</div>
      </section>

      {pendingPolicyAction ? <div role="alert" className="fixed bottom-52 right-5 z-20 w-[360px] rounded-xl border border-amber-200 bg-white p-4 shadow-lg shadow-slate-300/40"><div className="flex items-start gap-3"><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800">!</span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-slate-900">Policy warning</h2><p className="mt-1 text-sm leading-5 text-slate-600">{pendingPolicyAction.warnings[0]?.message}</p></div><button type="button" onClick={() => setPendingPolicyAction(null)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss policy warning"><X size={16} /></button></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setPendingPolicyAction(null)} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button><button type="button" onClick={() => { pendingPolicyAction.action(); setPendingPolicyAction(null); }} className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">Do it anyway</button></div></div> : null}
      <ScenarioDiffDrawer />
    </main>
  );
}
