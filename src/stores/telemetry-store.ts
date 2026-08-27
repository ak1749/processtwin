import { create } from 'zustand';

import type { ToolEnvelope } from '../webmcp/envelope';

export type WebMcpSupport = 'unknown' | 'supported' | 'unsupported';

export interface ToolTelemetry {
  calls: number;
  payloadBytes: number;
}

export interface TelemetryStore {
  support: WebMcpSupport;
  registeredToolNames: string[];
  tools: Record<string, ToolTelemetry>;
  totalCalls: number;
  payloadBytes: number;
  estimatedInteractionsAvoided: number;
  setSupport: (support: WebMcpSupport) => void;
  setRegisteredToolNames: (names: string[]) => void;
  record: (toolName: string, envelope: ToolEnvelope, input: unknown) => void;
}

function estimateOperationInteractionCost(operation: unknown): number {
  if (!operation || typeof operation !== 'object' || !('kind' in operation)) return 0;
  const kind = operation.kind;
  if (kind === 'create_step') return 3;
  if (kind === 'connect_steps') {
    const connection = 'connection' in operation ? operation.connection : undefined;
    return 2 + (connection && typeof connection === 'object' && 'condition' in connection ? 4 : 0);
  }
  if (kind === 'update_step') return 2;
  if (kind === 'update_connection') {
    const changes = 'changes' in operation ? operation.changes : undefined;
    return 2 + (changes && typeof changes === 'object' && 'condition' in changes ? 4 : 0);
  }
  return 0;
}

function estimateInteractions(toolName: string, input: unknown): number {
  if (!input || typeof input !== 'object') return 0;
  if (toolName === 'batch_mutate_process' && 'operations' in input && Array.isArray(input.operations)) {
    return input.operations.reduce((total, operation) => total + estimateOperationInteractionCost(operation), 0);
  }
  if (toolName === 'create_step') return 3;
  if (toolName === 'connect_steps') return 2 + ('condition' in input ? 4 : 0);
  if (toolName === 'update_step') return 2;
  if (toolName === 'update_connection') {
    const changes = 'changes' in input ? input.changes : undefined;
    return 2 + (changes && typeof changes === 'object' && 'condition' in changes ? 4 : 0);
  }
  return 0;
}

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  support: 'unknown',
  registeredToolNames: [],
  tools: {},
  totalCalls: 0,
  payloadBytes: 0,
  estimatedInteractionsAvoided: 0,
  setSupport: (support) => set({ support }),
  setRegisteredToolNames: (registeredToolNames) => set({ registeredToolNames }),
  record: (toolName, envelope, input) => {
    const payloadBytes = new TextEncoder().encode(JSON.stringify(envelope)).length;
    const estimatedInteractionsAvoided = estimateInteractions(toolName, input);
    set((state) => {
      const previous = state.tools[toolName] ?? { calls: 0, payloadBytes: 0 };
      return {
        tools: {
          ...state.tools,
          [toolName]: {
            calls: previous.calls + 1,
            payloadBytes: previous.payloadBytes + payloadBytes,
          },
        },
        totalCalls: state.totalCalls + 1,
        payloadBytes: state.payloadBytes + payloadBytes,
        estimatedInteractionsAvoided: state.estimatedInteractionsAvoided + estimatedInteractionsAvoided,
      };
    });
  },
}));

export function setWebMcpSupport(support: WebMcpSupport): void {
  useTelemetryStore.getState().setSupport(support);
}

export function syncRegisteredToolNames(names: string[]): void {
  useTelemetryStore.getState().setRegisteredToolNames(names);
}

export function recordToolTelemetry(toolName: string, envelope: ToolEnvelope, input: unknown): void {
  useTelemetryStore.getState().record(toolName, envelope, input);
}
