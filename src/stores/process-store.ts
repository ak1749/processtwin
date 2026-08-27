import { nanoid } from 'nanoid';
import { current } from 'immer';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { Actor, BusinessProcess } from '../types/process';

export interface ProcessSnapshot {
  process: BusinessProcess;
  stateVersion: number;
}

export interface DeltaRecord {
  version: number;
  actor: Actor;
  kind: string;
  entityIds: string[];
  summary: string;
  before?: unknown;
  after?: unknown;
}

export interface ProcessChange {
  actor: Actor;
  kind: string;
  entityIds: string[];
  summary: string;
  before?: unknown;
  after?: unknown;
}

export interface ProcessStore {
  process: BusinessProcess;
  stateVersion: number;
  past: ProcessSnapshot[];
  future: ProcessSnapshot[];
  deltaLog: DeltaRecord[];
  commitMutation: (process: BusinessProcess, change: ProcessChange) => number;
  undo: () => void;
  redo: () => void;
}

const HISTORY_CAP = 50;
const DELTA_LOG_CAP = 200;
const WORKSPACE_STORAGE_KEY = 'processtwin:workspace:v1';

const emptyStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export function createEmptyProcess(): BusinessProcess {
  const now = new Date().toISOString();

  return {
    id: nanoid(),
    name: 'Untitled process',
    nodes: [],
    edges: [],
    variables: [],
    policies: [],
    arrivalRatePerHour: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function cloneProcess(process: BusinessProcess): BusinessProcess {
  return structuredClone(process);
}

function cloneSnapshot(snapshot: ProcessSnapshot): ProcessSnapshot {
  return {
    process: cloneProcess(snapshot.process),
    stateVersion: snapshot.stateVersion,
  };
}

export const useProcessStore = create<ProcessStore>()(
  persist(
    immer((set) => ({
      process: createEmptyProcess(),
      stateVersion: 1,
      past: [],
      future: [],
      deltaLog: [],
      commitMutation: (process, change) => {
        let nextVersion = 1;

        set((state) => {
          state.past.push({
            process: cloneProcess(current(state.process)),
            stateVersion: state.stateVersion,
          });
          state.past = state.past.slice(-HISTORY_CAP);
          state.future = [];
          state.process = cloneProcess(process);
          state.stateVersion += 1;
          nextVersion = state.stateVersion;
          state.deltaLog.push({ ...change, version: nextVersion });
          state.deltaLog = state.deltaLog.slice(-DELTA_LOG_CAP);
        });

        return nextVersion;
      },
      undo: () => {
        set((state) => {
          const previous = state.past.pop();
          if (!previous) return;

          state.future.unshift({
            process: cloneProcess(current(state.process)),
            stateVersion: state.stateVersion,
          });
          state.future = state.future.slice(0, HISTORY_CAP);
          state.process = cloneProcess(previous.process);
          state.stateVersion += 1;
        });
      },
      redo: () => {
        set((state) => {
          const next = state.future.shift();
          if (!next) return;

          state.past.push({
            process: cloneProcess(current(state.process)),
            stateVersion: state.stateVersion,
          });
          state.past = state.past.slice(-HISTORY_CAP);
          state.process = cloneProcess(next.process);
          state.stateVersion += 1;
        });
      },
    })),
    {
      name: WORKSPACE_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? emptyStorage : window.localStorage,
      ),
      skipHydration: true,
      partialize: (state) => ({
        process: state.process,
        stateVersion: state.stateVersion,
        past: state.past.map(cloneSnapshot),
        future: state.future.map(cloneSnapshot),
        deltaLog: state.deltaLog,
      }),
    },
  ),
);

if (typeof window !== 'undefined') {
  useProcessStore.persist.rehydrate();
}
