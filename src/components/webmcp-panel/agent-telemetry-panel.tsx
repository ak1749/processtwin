'use client';

import { Gauge } from 'lucide-react';

import { useTelemetryStore } from '../../stores/telemetry-store';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function AgentTelemetryPanel() {
  const registeredToolNames = useTelemetryStore((state) => state.registeredToolNames);
  const tools = useTelemetryStore((state) => state.tools);
  const totalCalls = useTelemetryStore((state) => state.totalCalls);
  const payloadBytes = useTelemetryStore((state) => state.payloadBytes);
  const estimatedInteractionsAvoided = useTelemetryStore((state) => state.estimatedInteractionsAvoided);

  return <div className="h-full overflow-y-auto px-4 py-3" aria-label="Agent telemetry"><div className="flex items-center gap-2"><Gauge size={16} className="text-slate-500" /><div><h2 className="text-sm font-semibold text-slate-900">WebMCP session</h2><p className="text-xs text-slate-500">Live evidence of agent interaction through the command layer.</p></div></div><dl className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><dt className="text-xs text-slate-500">Tools registered</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{registeredToolNames.length}</dd></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><dt className="text-xs text-slate-500">Tool calls</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{totalCalls}</dd></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><dt className="text-xs text-slate-500">Payload returned</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{formatBytes(payloadBytes)}</dd></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><dt className="text-xs text-slate-500">≈ tokens</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{Math.round(payloadBytes / 4).toLocaleString()}</dd></div><div className="col-span-2 rounded-lg border border-violet-200 bg-violet-50 p-3"><dt className="text-xs text-violet-700">UI interactions avoided</dt><dd className="mt-1 text-lg font-semibold text-violet-950">≈ {estimatedInteractionsAvoided} <span className="text-sm font-normal text-violet-700">estimated</span></dd></div></dl><section className="mt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calls by tool</h3><ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">{registeredToolNames.length > 0 ? registeredToolNames.map((name) => <li key={name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span className="truncate font-mono text-slate-700">{name}</span><span className="shrink-0 tabular-nums text-slate-500">{tools[name]?.calls ?? 0}</span></li>) : <li className="px-3 py-3 text-sm text-slate-500">No tools are registered.</li>}</ul></section></div>;
}
