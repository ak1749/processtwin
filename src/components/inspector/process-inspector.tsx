'use client';

import { useState } from 'react';
import { Link2, SlidersHorizontal } from 'lucide-react';

import { updateConnection } from '../../domain/commands/update-connection';
import { updateStep } from '../../domain/commands/update-step';
import type { PolicyOperation } from '../../domain/policies';
import type { BusinessProcess, Operator, ProcessConnection, ProcessStep } from '../../types/process';
import type { Selection } from '../canvas/process-canvas';
import { PolicyChips } from './policy-chips';

interface ProcessInspectorProps {
  process: BusinessProcess;
  selection: Selection;
  runHumanAction: (action: () => void, operation: PolicyOperation) => void;
  scenarioId?: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-slate-600">
      {label}
      {children}
    </label>
  );
}

const fieldClass = 'w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500';
const operators: Array<{ value: Operator; label: string }> = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'gt', label: 'is greater than' },
  { value: 'gte', label: 'is at least' },
  { value: 'lt', label: 'is less than' },
  { value: 'lte', label: 'is at most' },
];

function NodeInspector({
  step,
  runHumanAction,
  policies,
  scenarioId,
}: {
  step: ProcessStep;
  runHumanAction: ProcessInspectorProps['runHumanAction'];
  policies: BusinessProcess['policies'];
  scenarioId?: string;
}) {
  const showsWorkFields = step.type === 'action' || step.type === 'approval';
  const showsDescription = step.type !== 'start' && step.type !== 'end';

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = (name: string) => String(values.get(name) ?? '').trim();
    const numberOrNull = (name: string) => {
      const value = text(name);
      return value === '' ? null : Number(value);
    };
    const changes = {
      name: text('name'),
      ...(showsDescription ? { description: text('description') || null } : {}),
      ...(showsWorkFields
        ? {
            owner: text('owner') || null,
            duration: {
              minMinutes: Number(text('minMinutes')),
              typicalMinutes: Number(text('typicalMinutes')),
              maxMinutes: Number(text('maxMinutes')),
            },
            cost: numberOrNull('cost'),
            capacityPerHour: numberOrNull('capacityPerHour'),
          }
        : {}),
    };

    runHumanAction(
      () => {
        updateStep({ actor: 'human', scenarioId }, { id: step.id, changes });
      },
      { kind: 'update_step', stepId: step.id, changes },
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><SlidersHorizontal size={16} /></span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{step.type[0].toUpperCase() + step.type.slice(1)} step</p>
          <p className="text-xs text-slate-500">Edit process details</p>
        </div>
      </div>
      <Field label="Name"><input name="name" defaultValue={step.name} className={fieldClass} required /></Field>
      {showsDescription ? <Field label="Description"><textarea name="description" defaultValue={step.description} className={`${fieldClass} min-h-20 resize-y`} /></Field> : null}
      {showsWorkFields ? (
        <>
          <Field label="Owner"><input name="owner" defaultValue={step.owner} className={fieldClass} placeholder="Team or role" /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Min (min)"><input name="minMinutes" type="number" min="0" defaultValue={step.duration.minMinutes} className={fieldClass} required /></Field>
            <Field label="Typical (min)"><input name="typicalMinutes" type="number" min="0" defaultValue={step.duration.typicalMinutes} className={fieldClass} required /></Field>
            <Field label="Max (min)"><input name="maxMinutes" type="number" min="0" defaultValue={step.duration.maxMinutes} className={fieldClass} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={step.cost} className={fieldClass} placeholder="Optional" /></Field>
            <Field label="Capacity / hour"><input name="capacityPerHour" type="number" min="0.1" step="0.1" defaultValue={step.capacityPerHour} className={fieldClass} placeholder="Unlimited" /></Field>
          </div>
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">This step is instantaneous. Duration, cost, and capacity do not apply.</p>
      )}
      <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 active:translate-y-px">Save changes</button>
      <PolicyChips step={step} policies={policies} scenarioId={scenarioId} />
    </form>
  );
}

function EdgeInspector({
  edge,
  runHumanAction,
  scenarioId,
}: {
  edge: ProcessConnection;
  runHumanAction: ProcessInspectorProps['runHumanAction'];
  scenarioId?: string;
}) {
  const [hasCondition, setHasCondition] = useState(Boolean(edge.condition));

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const rawValue = String(values.get('conditionValue') ?? '').trim();
    const numericValue = Number(rawValue);
    const conditionValue = rawValue !== '' && Number.isFinite(numericValue) ? numericValue : rawValue;
    const label = String(values.get('label') ?? '').trim();
    const probabilityValue = String(values.get('probability') ?? '').trim();
    const condition = hasCondition
      ? {
          variable: String(values.get('variable') ?? '').trim(),
          operator: String(values.get('operator') ?? 'eq') as Operator,
          value: conditionValue,
        }
      : null;
    const changes = {
      label: label || null,
      condition,
      probability: probabilityValue === '' ? null : Number(probabilityValue),
    };
    runHumanAction(
      () => {
        updateConnection({ actor: 'human', scenarioId }, { id: edge.id, changes });
      },
      { kind: 'update_connection', connectionId: edge.id, changes },
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Link2 size={16} /></span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Connection</p>
          <p className="text-xs text-slate-500">Route between two steps</p>
        </div>
      </div>
      <Field label="Label"><input name="label" defaultValue={edge.label} className={fieldClass} placeholder="Optional branch label" /></Field>
      <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
        Add condition
        <input type="checkbox" checked={hasCondition} onChange={(event) => setHasCondition(event.target.checked)} className="h-4 w-4 accent-slate-900" />
      </label>
      {hasCondition ? (
        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <Field label="Variable"><input name="variable" defaultValue={edge.condition?.variable} className={fieldClass} placeholder="amount" required /></Field>
          <Field label="Operator"><select name="operator" defaultValue={edge.condition?.operator ?? 'eq'} className={fieldClass}>{operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select></Field>
          <Field label="Value"><input name="conditionValue" defaultValue={String(edge.condition?.value ?? '')} className={fieldClass} placeholder="500" required /></Field>
        </div>
      ) : null}
      <Field label="Probability"><input name="probability" type="number" min="0" max="1" step="0.01" defaultValue={edge.probability} className={fieldClass} placeholder="Optional fallback probability" /></Field>
      <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 active:translate-y-px">Save connection</button>
    </form>
  );
}

export function ProcessInspector({ process, selection, runHumanAction, scenarioId }: ProcessInspectorProps) {
  const selectedStep = selection?.kind === 'node' ? process.nodes.find((step) => step.id === selection.id) : undefined;
  const selectedEdge = selection?.kind === 'edge' ? process.edges.find((edge) => edge.id === selection.id) : undefined;

  return (
    <aside className="min-h-0 overflow-y-auto bg-white p-4" aria-label="Inspector">
      {selectedStep ? <NodeInspector key={selectedStep.id} step={selectedStep} policies={process.policies} scenarioId={scenarioId} runHumanAction={runHumanAction} /> : null}
      {selectedEdge ? <EdgeInspector key={selectedEdge.id} edge={selectedEdge} scenarioId={scenarioId} runHumanAction={runHumanAction} /> : null}
      {!selectedStep && !selectedEdge ? (
        <div className="pt-8 text-center">
          <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><SlidersHorizontal size={19} /></span>
          <h2 className="mt-3 text-sm font-semibold text-slate-800">Nothing selected</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Select a step or connection to edit its details.</p>
        </div>
      ) : null}
    </aside>
  );
}
