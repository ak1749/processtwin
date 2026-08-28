'use client';

import { AlertTriangle, Check, X } from 'lucide-react';

import { diffScenario, getScenario, scenarioStatus } from '../../domain/scenarios';
import { mergeProcessScenario } from '../../domain/commands/scenario-commands';
import { discardProcessScenario } from '../../domain/commands/scenario-commands';
import { simulateProcess } from '../../domain/simulation/simulate';
import { useProcessStore } from '../../stores/process-store';
import { useScenarioStore } from '../../stores/scenario-store';

function Metric({ label, before, after }: { label: string; before: number; after: number }) {
  return <tr><th className="py-1 text-left font-medium text-slate-600">{label}</th><td className="py-1 text-right tabular-nums">{before.toFixed(1)}</td><td className="py-1 text-right tabular-nums font-medium text-slate-900">{after.toFixed(1)}</td></tr>;
}

export function ScenarioDiffDrawer() {
  const pendingId = useScenarioStore((state) => state.pendingMergeScenarioId);
  const clear = useScenarioStore((state) => state.setPendingMergeScenarioId);
  const main = useProcessStore((state) => state.process);
  if (!pendingId) return null;
  const scenario = getScenario(pendingId);
  if (!scenario) return null;
  const diff = diffScenario(scenario.id);
  const before = simulateProcess(main, { iterations: 5000, seed: 42 });
  const after = simulateProcess(scenario.process, { iterations: 5000, seed: 42 });
  const status = scenarioStatus(scenario);
  const changes = [
    ...(diff?.added ?? []).map((step) => `+ ${step.name}`),
    ...(diff?.modified ?? []).map((change) => `~ ${change.stepId}: ${change.field}`),
    ...(diff?.removed ?? []).map((step) => `− ${step.name}`),
  ];
  return <aside className="fixed bottom-5 left-1/2 z-30 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/40" aria-label="Scenario diff review">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wide text-violet-600">Scenario review</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{scenario.title}</h2><p className="mt-1 text-sm text-slate-600">{scenario.reason}</p>{scenario.mergeSummary ? <p className="mt-2 text-sm text-slate-800"><span className="font-medium">Agent rationale:</span> {scenario.mergeSummary}</p> : null}</div><button type="button" onClick={() => clear(null)} aria-label="Close scenario review" className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
    {status === 'stale' ? <p className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900"><AlertTriangle size={16} /> Main changed since this branch was created. Re-fork before applying.</p> : null}
    {diff?.policyConflicts.length ? <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800"><p className="font-medium">Policy conflicts</p><p className="mt-1">{diff.policyConflicts.map((policy) => policy.label).join(', ')}</p></div> : null}
    <div className="mt-4 grid gap-4 md:grid-cols-2"><section><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Changes</h3><ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm text-slate-700">{changes.length ? changes.map((change, index) => <li key={`${change}-${index}`} className={change.startsWith('+') ? 'text-emerald-700' : change.startsWith('−') ? 'text-rose-700' : 'text-amber-700'}>{change}</li>) : <li>No structural changes.</li>}</ul></section><section><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Simulation · seed 42</h3><table className="mt-2 w-full text-sm text-slate-700"><thead><tr className="text-xs text-slate-500"><th /><th className="text-right">Before</th><th className="text-right">After</th></tr></thead><tbody><Metric label="P50 minutes" before={before.p50Minutes} after={after.p50Minutes} /><Metric label="P95 minutes" before={before.p95Minutes} after={after.p95Minutes} /><Metric label="Average cycle" before={before.averageCycleTimeMinutes} after={after.averageCycleTimeMinutes} /></tbody></table></section></div>
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { discardProcessScenario({ actor: 'human' }, { scenarioId: scenario.id, confirm: true }); }} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reject</button><button type="button" disabled={status !== 'open' || Boolean(diff?.policyConflicts.length)} onClick={() => mergeProcessScenario({ actor: 'human' }, { scenarioId: scenario.id })} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Check size={15} /> Apply changes</button></div>
  </aside>;
}
