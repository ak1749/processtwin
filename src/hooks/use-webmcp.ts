'use client';

import { useEffect, useRef, useState } from 'react';

import { useProcessStore } from '../stores/process-store';
import { useTelemetryStore } from '../stores/telemetry-store';
import { reconcileTools } from '../webmcp/reconcile';
import { registerTools, type ToolRegistry } from '../webmcp/register';
import { coreTools } from '../webmcp/tools';

export function useWebMcp(): void {
  const stateVersion = useProcessStore((state) => state.stateVersion);
  const registryRef = useRef<ToolRegistry | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    registryRef.current = registerTools([], controller.signal);
    setReady(true);
    return () => {
      controller.abort();
      controllerRef.current = null;
      registryRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const controller = controllerRef.current;
    const registry = registryRef.current;
    if (!ready || !controller || !registry) return;
    const desiredTools = stateVersion > 0 ? coreTools : [];
    reconcileTools(desiredTools, registry, controller.signal);
  }, [ready, stateVersion]);

  useEffect(() => {
    if (typeof document !== 'undefined' && !('modelContext' in document)) {
      useTelemetryStore.getState().setSupport('unsupported');
    }
  }, []);
}
