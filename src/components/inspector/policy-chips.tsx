'use client';

import { LockKeyhole, Plus, Unlock } from 'lucide-react';

import { addPolicy } from '../../domain/commands/add-policy';
import { removePolicy } from '../../domain/commands/remove-policy';
import type { ProcessPolicy, ProcessStep } from '../../types/process';

interface PolicyChipsProps {
  step: ProcessStep;
  policies: ProcessPolicy[];
  scenarioId?: string;
}

export function PolicyChips({ step, policies, scenarioId }: PolicyChipsProps) {
  const attached = policies.filter((policy) => policy.rule.kind !== 'require_step_on_path' && policy.rule.stepId === step.id);
  const addLock = () => addPolicy({ actor: 'human', scenarioId }, { label: `Protect ${step.name}`, rule: { kind: 'lock_step', stepId: step.id, lockedFields: ['name', 'duration', 'capacityPerHour'] } });
  return <section className="border-t border-slate-100 pt-4" aria-label="Step policies">
    <div className="flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policies</h3><button type="button" onClick={addLock} className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950"><Plus size={13} /> Add policy</button></div>
    {attached.length === 0 ? <p className="mt-2 text-xs text-slate-500">No active constraints on this step.</p> : <div className="mt-2 flex flex-wrap gap-1.5">{attached.map((policy) => <details key={policy.id} className="group relative"><summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800"><LockKeyhole size={11} /> {policy.label}</summary><div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg"><p className="text-xs leading-5 text-slate-600">{policy.label}</p><button type="button" onClick={() => removePolicy({ actor: 'human', scenarioId }, { id: policy.id })} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-700"><Unlock size={12} /> Unlock</button></div></details>)}</div>}
  </section>;
}
