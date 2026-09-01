'use client';

import { Bot, ChevronLeft, ChevronRight, CircleCheck, CircleX } from 'lucide-react';

import { useTelemetryStore } from '../../stores/telemetry-store';

interface WebMcpPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function WebMcpPanel({ collapsed, onToggle }: WebMcpPanelProps) {
  const support = useTelemetryStore((state) => state.support);
  const registeredToolNames = useTelemetryStore((state) => state.registeredToolNames);
  const tools = useTelemetryStore((state) => state.tools);
  const totalCalls = useTelemetryStore((state) => state.totalCalls);
  const estimatedInteractionsAvoided = useTelemetryStore((state) => state.estimatedInteractionsAvoided);
  const supported = support === 'supported';

  if (collapsed) {
    return (
      <aside className="flex min-h-0 flex-col items-center gap-4 bg-white p-3" aria-label="WebMCP status, collapsed">
        <button type="button" onClick={onToggle} className="pt-subtle-control h-8 w-8 p-0" aria-label="Expand WebMCP panel" title="Expand WebMCP panel"><ChevronLeft size={16} /></button>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${supported ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} title={supported ? 'WebMCP supported' : 'WebMCP not detected'}>
          {supported ? <CircleCheck size={18} /> : <CircleX size={18} />}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums text-slate-700" title={`${registeredToolNames.length} registered tools`}>{registeredToolNames.length}</span>
      </aside>
    );
  }

  return (
    <aside className="min-h-0 overflow-y-auto bg-white p-4" aria-label="WebMCP status">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${supported ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {supported ? <CircleCheck size={18} /> : <CircleX size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="pt-section-label">Agent connection</p>
          <h2 className="mt-0.5 text-sm font-semibold tracking-[-0.02em] text-slate-900">WebMCP</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {supported ? 'Supported — tools are live for an agent.' : 'WebMCP not detected — ProcessTwin works normally. Open in ChatGPT\'s desktop in-app browser, or Chrome 149+ with chrome://flags/#enable-webmcp-testing, to collaborate with an agent.'}
          </p>
        </div>
        <button type="button" onClick={onToggle} className="pt-subtle-control h-8 w-8 shrink-0 p-0" aria-label="Collapse WebMCP panel" title="Collapse WebMCP panel"><ChevronRight size={16} /></button>
      </div>

      <section className="mt-5" aria-labelledby="registered-tools-title">
        <div className="flex items-center justify-between"><h3 id="registered-tools-title" className="pt-section-label">Live tools</h3><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700">{registeredToolNames.length}</span></div>
        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
          {registeredToolNames.length > 0 ? registeredToolNames.map((name) => (
            <li key={name} className="flex items-center justify-between gap-2 px-3 py-2 text-xs"><span className="truncate font-mono text-slate-700">{name}</span><span className="shrink-0 text-slate-400">{tools[name]?.calls ?? 0} calls</span></li>
          )) : <li className="px-3 py-3 text-xs text-slate-500">No tools registered.</li>}
        </ul>
      </section>

      <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label="Condensed agent session summary">
        <p className="pt-section-label">Agent session</p>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Tool calls</dt><dd className="mt-0.5 font-semibold text-slate-800">{totalCalls}</dd></div><div><dt className="text-slate-500">Interactions avoided</dt><dd className="mt-0.5 font-semibold text-slate-800">≈ {estimatedInteractionsAvoided}</dd></div></dl>
      </section>

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500"><Bot size={14} className="shrink-0 text-slate-600" /> Human and agent mutations share the command layer.</div>
    </aside>
  );
}
