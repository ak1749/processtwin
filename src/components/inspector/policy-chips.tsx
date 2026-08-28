'use client';

import { useState } from 'react';
import { LockKeyhole, Plus, Unlock } from 'lucide-react';

import { addPolicy } from '../../domain/commands/add-policy';
import { removePolicy } from '../../domain/commands/remove-policy';
import type { Operator, ProcessPolicy, ProcessStep, StepType, VariableSpec } from '../../types/process';

interface PolicyChipsProps {
  step: ProcessStep;
  policies: ProcessPolicy[];
  variables: VariableSpec[];
  scenarioId?: string;
}

const operators: Array<{ value: Operator; label: string }> = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'gt', label: 'is greater than' },
  { value: 'gte', label: 'is at least' },
  { value: 'lt', label: 'is less than' },
  { value: 'lte', label: 'is at most' },
];
const stepTypes: StepType[] = ['action', 'approval', 'decision', 'end', 'start'];
const fieldClass = 'w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-50';

export function PolicyChips({ step, policies, variables, scenarioId }: PolicyChipsProps) {
  const [showPolicyMenu, setShowPolicyMenu] = useState(false);
  const [showPathPolicy, setShowPathPolicy] = useState(false);
  const attached = policies.filter((policy) => policy.rule.kind !== 'require_step_on_path' && policy.rule.stepId === step.id);
  const groupedPolicies = Array.from(
    attached.reduce((groups, policy) => {
      const group = groups.get(policy.label) ?? [];
      group.push(policy);
      groups.set(policy.label, group);
      return groups;
    }, new Map<string, ProcessPolicy[]>()),
  );
  const pathPolicies = policies.filter((policy) => policy.rule.kind === 'require_step_on_path');
  const numericVariables = variables.filter((variable) => variable.kind === 'number' || variable.kind === 'constant');
  const addLock = () => {
    const label = `${step.name} is locked`;
    addPolicy({ actor: 'human', scenarioId }, {
      label,
      rule: { kind: 'lock_step', stepId: step.id, lockedFields: ['type', 'name', 'description', 'owner', 'duration', 'cost', 'capacityPerHour', 'position'] },
    });
    addPolicy({ actor: 'human', scenarioId }, { label, rule: { kind: 'no_delete', stepId: step.id } });
  };
  const addPathPolicy = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const whenVariable = String(values.get('whenVariable') ?? '');
    const operator = String(values.get('operator') ?? 'gt') as Operator;
    const value = Number(values.get('value'));
    const requiredStepType = String(values.get('requiredStepType') ?? 'approval') as StepType;
    addPolicy({ actor: 'human', scenarioId }, {
      label: `${requiredStepType[0].toUpperCase() + requiredStepType.slice(1)} required when ${whenVariable} ${operator} ${value}`,
      rule: { kind: 'require_step_on_path', whenVariable, operator, value, requiredStepType },
    });
    setShowPathPolicy(false);
  };

  return <section className="border-t border-slate-100 pt-4" aria-label="Step policies">
    <div className="flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policies</h3><button type="button" onClick={() => setShowPolicyMenu((visible) => !visible)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950"><Plus size={13} /> Add policy</button></div>
    {showPolicyMenu ? <div className="mt-2 grid gap-1 rounded-lg border border-slate-200 bg-white p-1"><button type="button" onClick={() => { addLock(); setShowPolicyMenu(false); }} className="rounded-md px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Lock this step and prevent deletion</button><button type="button" onClick={() => { setShowPathPolicy(true); setShowPolicyMenu(false); }} className="rounded-md px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Require a step on a matching path</button></div> : null}
    {groupedPolicies.length === 0 ? <p className="mt-2 text-xs text-slate-500">No active constraints on this step.</p> : <div className="mt-2 flex flex-wrap gap-1.5">{groupedPolicies.map(([label, group]) => <details key={label} className="group relative"><summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800"><LockKeyhole size={11} /> {label}</summary><div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg"><p className="text-xs leading-5 text-slate-600">{label}</p><button type="button" onClick={() => group.forEach((policy) => removePolicy({ actor: 'human', scenarioId }, { id: policy.id }))} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-700"><Unlock size={12} /> Unlock</button></div></details>)}</div>}
    <div className="mt-4 border-t border-slate-100 pt-3">
      <p className="text-xs font-medium text-slate-600">Path requirements</p>
      {pathPolicies.length > 0 ? <p className="mt-2 text-xs leading-5 text-slate-500">{pathPolicies.map((policy) => policy.label).join(' · ')}</p> : null}
      {showPathPolicy ? <form onSubmit={addPathPolicy} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3"><label className="grid gap-1 text-xs font-medium text-slate-600">When variable<select name="whenVariable" className={fieldClass} disabled={numericVariables.length === 0} defaultValue={numericVariables[0]?.key}>{numericVariables.map((variable) => <option key={variable.key} value={variable.key}>{variable.label}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-600">Condition<select name="operator" className={fieldClass} defaultValue="gt">{operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-600">Value<input name="value" type="number" className={fieldClass} defaultValue="2000" required /></label><label className="grid gap-1 text-xs font-medium text-slate-600">Required step type<select name="requiredStepType" className={fieldClass} defaultValue="approval">{stepTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>{numericVariables.length === 0 ? <p className="text-xs text-amber-700">Add a numeric process variable before creating this policy.</p> : null}<button type="submit" disabled={numericVariables.length === 0} className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Require step on path</button></form> : null}
    </div>
  </section>;
}
