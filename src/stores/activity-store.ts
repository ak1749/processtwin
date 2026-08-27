import { nanoid } from 'nanoid';
import { create } from 'zustand';

import type { Actor } from '../types/process';

export interface ActivityEvent {
  id: string;
  actor: Actor;
  action: string;
  title: string;
  description?: string;
  timestamp: string;
  entityIds?: string[];
  undoToken?: string;
}

export interface ActivityStore {
  events: ActivityEvent[];
  append: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => ActivityEvent;
  clear: () => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  events: [],
  append: (event) => {
    const activityEvent: ActivityEvent = {
      ...event,
      id: nanoid(),
      timestamp: new Date().toISOString(),
    };

    set((state) => ({ events: [...state.events, activityEvent] }));
    return activityEvent;
  },
  clear: () => set({ events: [] }),
}));
