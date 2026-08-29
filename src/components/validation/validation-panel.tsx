'use client';

import { CircleAlert, Lightbulb, TriangleAlert } from 'lucide-react';

import { validateProcess, type ValidationIssue, type ValidationSeverity } from '../../domain/validation/validate-process';
import type { BusinessProcess } from '../../types/process';

interface ValidationPanelProps {
  process: BusinessProcess;
  onSelectNode: (id: string) => void;
}

const groups: Array<{ severity: ValidationSeverity; label: string; icon: typeof CircleAlert; tone: string }> = [
  { severity: 'error', label: 'Errors', icon: CircleAlert, tone: 'text-rose-700' },
  { severity: 'warning', label: 'Warnings', icon: TriangleAlert, tone: 'text-amber-700' },
  { severity: 'suggestion', label: 'Suggestions', icon: Lightbulb, tone: 'text-sky-700' },
];

function IssueCard({ issue, process, onSelectNode }: { issue: ValidationIssue; process: BusinessProcess; onSelectNode: (id: string) => void }) {
  const nodeId = issue.entityIds.find((id) => process.nodes.some((node) => node.id === id));
  const content = <><p className="text-sm font-medium text-slate-800">{issue.message}</p>{issue.suggestedFix ? <p className="mt-1 text-xs leading-5 text-slate-500">{issue.suggestedFix}</p> : null}</>;
  return nodeId ? <button type="button" onClick={() => onSelectNode(nodeId)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:border-slate-300 hover:bg-slate-50">{content}<span className="mt-1.5 block text-xs font-medium text-violet-700">Select affected step</span></button> : <div className="rounded-md border border-slate-200 px-3 py-2">{content}</div>;
}

export function ValidationPanel({ process, onSelectNode }: ValidationPanelProps) {
  const validation = validateProcess(process);

  return <div className="h-full overflow-y-auto px-4 py-3" aria-label="Process validation">
    <div className="flex items-baseline justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Process validation</h2><p className="mt-0.5 text-xs text-slate-500">Current graph checks update as you edit.</p></div><span className={`rounded-full px-2 py-1 text-xs font-medium ${validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{validation.valid ? 'Valid' : 'Needs attention'}</span></div>
    <div className="mt-4 space-y-4">{groups.map(({ severity, label, icon: Icon, tone }) => {
      const issues = validation.issues.filter((issue) => issue.severity === severity);
      return <section key={severity}><div className="flex items-center gap-2"><Icon size={15} className={tone} /><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</h3><span className="text-xs text-slate-400">{issues.length}</span></div><div className="mt-2 space-y-2">{issues.length > 0 ? issues.map((issue, index) => <IssueCard key={`${issue.code}-${index}`} issue={issue} process={process} onSelectNode={onSelectNode} />) : <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">No {label.toLowerCase()}.</p>}</div></section>;
    })}</div>
  </div>;
}
