'use client';

import { Bot, CircleCheck, CircleX, Gauge } from 'lucide-react';

import { useTelemetryStore } from '../../stores/telemetry-store';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function WebMcpPanel() {
  const support = useTelemetryStore((state) => state.support);
  const registeredToolNames = useTelemetryStore((state) => state.registeredToolNames);
  const tools = useTelemetryStore((state) => state.tools);
  const totalCalls = useTelemetryStore((state) => state.totalCalls);
  const payloadBytes = useTelemetryStore((state) => state.payloadBytes);
  const estimatedInteractionsAvoided = useTelemetryStore((state) => state.estimatedInteractionsAvoided);
  const supported = support === 'supported';

  return (
    <aside className="min-h-0 overflow-y-auto bg-white p-4" aria-label="WebMCP status">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${supported ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {supported ? <CircleCheck size={18} /> : <CircleX size={18} />}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">WebMCP</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {supported ? 'Supported — tools are live for an agent.' : 'WebMCP not detected — ProcessTwin works normally. Open in ChatGPT\'s desktop in-app browser, or Chrome 149+ with chrome://flags/#enable-webmcp-testing, to collaborate with an agent.'}
          </p>
        </div>
      </div>

      <section className="mt-5" aria-labelledby="registered-tools-title">
        <div className="flex items-center justify-between"><h3 id="registered-tools-title" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live tools</h3><span className="text-xs font-medium text-slate-700">{registeredToolNames.length} registered</span></div>
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {registeredToolNames.length > 0 ? registeredToolNames.map((name) => (
            <li key={name} className="flex items-center justify-between gap-2 px-3 py-2 text-xs"><span className="truncate font-mono text-slate-700">{name}</span><span className="shrink-0 text-slate-400">{tools[name]?.calls ?? 0} calls</span></li>
          )) : <li className="px-3 py-3 text-xs text-slate-500">No tools registered.</li>}
        </ul>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-labelledby="telemetry-title">
        <div className="flex items-center gap-2"><Gauge size={15} className="text-slate-500" /><h3 id="telemetry-title" className="text-sm font-semibold text-slate-800">WebMCP session</h3></div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div><dt className="text-slate-500">Tool calls</dt><dd className="mt-0.5 font-semibold text-slate-800">{totalCalls}</dd></div>
          <div><dt className="text-slate-500">Payload returned</dt><dd className="mt-0.5 font-semibold text-slate-800">{formatBytes(payloadBytes)}</dd></div>
          <div><dt className="text-slate-500">≈ tokens</dt><dd className="mt-0.5 font-semibold text-slate-800">{Math.round(payloadBytes / 4).toLocaleString()}</dd></div>
          <div><dt className="text-slate-500">UI interactions avoided</dt><dd className="mt-0.5 font-semibold text-slate-800">≈ {estimatedInteractionsAvoided} <span className="font-normal text-slate-500">estimated</span></dd></div>
        </dl>
      </section>

      <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500"><Bot size={14} /> Human and agent mutations share the command layer.</div>
    </aside>
  );
}
