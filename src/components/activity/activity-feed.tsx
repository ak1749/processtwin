'use client';

import { useEffect, useState } from 'react';
import { Bot, ChevronDown, ChevronRight, History, RotateCcw, UserRound } from 'lucide-react';

import { undoProcess } from '../../domain/commands/undo-process';
import { useActivityStore, type ActivityEvent } from '../../stores/activity-store';
import { useProcessStore } from '../../stores/process-store';

function relativeTime(timestamp: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 1000));
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function ActivityRow({ event, canUndo }: { event: ActivityEvent; canUndo: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const isAgent = event.actor === 'agent';

  const isBatch = event.action === 'batch_mutate_process';

  return (
    <li className="flex min-w-[280px] items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isAgent ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`} aria-label={isAgent ? 'Agent action' : 'Human action'}>
        {isAgent ? <Bot size={14} /> : <UserRound size={14} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          {isBatch ? <button type="button" onClick={() => setExpanded((value) => !value)} className="shrink-0 rounded text-slate-500 hover:text-slate-800" aria-label={expanded ? `Collapse ${event.title}` : `Expand ${event.title}`}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button> : null}
          <p className="truncate text-sm font-medium text-slate-800">{event.title}</p>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{relativeTime(event.timestamp, now)}</p>
        {isBatch && expanded ? <p className="mt-2 text-xs leading-5 text-slate-500">{event.description ?? 'This transaction was applied atomically.'}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => undoProcess({ actor: 'human' }, {})}
        disabled={!canUndo}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Undo ${event.title}`}
      >
        <RotateCcw size={13} /> Undo
      </button>
    </li>
  );
}

export function ActivityFeed() {
  const events = useActivityStore((state) => state.events);
  const canUndo = useProcessStore((state) => state.past.length > 0);
  const newestFirst = [...events].reverse();

  if (newestFirst.length === 0) {
    return (
      <div className="flex h-full items-center gap-3 px-4 text-sm text-slate-500">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><History size={15} /></span>
        Your edits will appear here.
      </div>
    );
  }

  return (
    <ul className="flex h-full min-w-0 gap-2 overflow-x-auto px-4 py-2" aria-label="Activity feed">
      {newestFirst.map((event, index) => <ActivityRow key={event.id} event={event} canUndo={canUndo && index === 0} />)}
    </ul>
  );
}
