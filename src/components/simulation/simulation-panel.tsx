'use client';

import { useState } from 'react';

import { runSimulation } from '../../domain/commands/run-simulation';
import { analyzeBottlenecks } from '../../domain/simulation/bottlenecks';
import { useSimulationStore } from '../../stores/simulation-store';

function minutes(value: number): string {
  if (value >= 60) return `${(value / 60).toFixed(2)}h`;
  return `${value.toFixed(1)} min`;
}

function signed(value: number, format: (amount: number) => string): string {
  if (value === 0) return '—';
  return `${value > 0 ? '+' : '−'}${format(Math.abs(value))}`;
}

export function SimulationPanel() {
  const result = useSimulationStore((state) => state.result);
  const baseline = useSimulationStore((state) => state.baseline);
  const clearBaseline = useSimulationStore((state) => state.clearBaseline);
  const [iterations, setIterations] = useState('5000');
  const [seed, setSeed] = useState('42');
  const [error, setError] = useState<string | null>(null);
  const bottlenecks = result ? analyzeBottlenecks(result) : [];
  const comparison = baseline && result
    ? [
        { label: 'P50', before: minutes(baseline.result.p50Minutes), after: minutes(result.p50Minutes), delta: signed(result.p50Minutes - baseline.result.p50Minutes, minutes) },
        { label: 'P95', before: minutes(baseline.result.p95Minutes), after: minutes(result.p95Minutes), delta: signed(result.p95Minutes - baseline.result.p95Minutes, minutes) },
        { label: 'Average cost', before: `$${baseline.result.averageCost.toFixed(2)}`, after: `$${result.averageCost.toFixed(2)}`, delta: signed(result.averageCost - baseline.result.averageCost, (value) => `$${value.toFixed(2)}`) },
        { label: 'Completion rate', before: `${(baseline.result.completionRate * 100).toFixed(1)}%`, after: `${(result.completionRate * 100).toFixed(1)}%`, delta: signed((result.completionRate - baseline.result.completionRate) * 100, (value) => `${value.toFixed(1)} pp`) },
      ]
    : null;

  function run(): void {
    const response = runSimulation({ actor: 'human' }, { iterations: Number(iterations), seed: Number(seed) });
    setError(response.ok ? null : response.error?.message ?? 'Simulation could not run.');
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-medium text-slate-600">Iterations<input aria-label="Simulation iterations" value={iterations} onChange={(event) => setIterations(event.target.value)} inputMode="numeric" className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900" /></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Seed<input aria-label="Simulation seed" value={seed} onChange={(event) => setSeed(event.target.value)} inputMode="numeric" className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900" /></label>
        <button type="button" onClick={run} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">Run simulation</button>
        {error ? <p role="alert" className="text-xs text-rose-600">{error}</p> : null}
      </div>
      {!result ? <p className="mt-5 text-sm text-slate-500">Run a seeded simulation to see timing, completion, cost, and bottleneck results.</p> : <>
        {comparison ? <section className="mt-4 rounded-lg border border-violet-200 bg-violet-50/40 p-3" aria-label="Simulation before and after comparison"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Before / after</h2><p className="text-xs text-slate-600">Baseline: {baseline?.label}</p></div><button type="button" onClick={clearBaseline} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" aria-label="Clear simulation baseline">Clear baseline</button></div><table className="mt-3 w-full text-sm"><thead className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-500"><tr><th className="pb-1.5">Metric</th><th className="pb-1.5 text-right">Before</th><th className="pb-1.5 text-right">After</th><th className="pb-1.5 text-right">Delta</th></tr></thead><tbody>{comparison.map((row) => <tr key={row.label} className="border-t border-violet-100 text-slate-700"><th className="py-1.5 text-left font-medium">{row.label}</th><td className="py-1.5 text-right tabular-nums">{row.before}</td><td className="py-1.5 text-right tabular-nums font-medium text-slate-900">{row.after}</td><td className={`py-1.5 text-right tabular-nums ${row.delta.startsWith('−') ? 'text-emerald-700' : row.delta.startsWith('+') ? 'text-rose-700' : 'text-slate-500'}`}>{row.delta}</td></tr>)}</tbody></table></section> : null}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {[
            ['Average', minutes(result.averageCycleTimeMinutes)], ['P50', minutes(result.p50Minutes)], ['P95', minutes(result.p95Minutes)], ['Completion', `${(result.completionRate * 100).toFixed(1)}%`], ['Average cost', `$${result.averageCost.toFixed(2)}`],
          ].map(([label, value]) => <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[11px] font-medium text-slate-500">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p></div>)}
        </div>
        <div className="mt-4"><div className="flex items-baseline justify-between"><h2 className="text-sm font-semibold text-slate-900">Bottlenecks</h2><span className="text-xs text-slate-500">weighted by time, duration, and utilisation</span></div>
          <ol className="mt-2 space-y-2">{bottlenecks.map((entry, index) => <li key={entry.stepId} className="rounded-md border border-slate-200 px-3 py-2"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-800"><span className="mr-2 text-slate-400">{index + 1}</span>{entry.stepName}</p><span className="text-xs tabular-nums text-slate-500">{Math.round(entry.totalTimeShare * 100)}% cycle time</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, entry.totalTimeShare * 100)}%` }} /></div><p className="mt-1.5 text-xs text-slate-500">{entry.reasons.join(' · ')}</p></li>)}</ol>
        </div>
      </>}
    </div>
  );
}
