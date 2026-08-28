'use client';

import { useEffect, useRef, useState } from 'react';

import { useProcessStore } from '../stores/process-store';
import { useTelemetryStore } from '../stores/telemetry-store';
import { reconcileTools } from '../webmcp/reconcile';
import { registerTools, type ToolRegistry } from '../webmcp/register';
import { analyzeBottlenecksTool, compareScenariosTool, coreTools, discardScenarioTool, forkScenarioTool, getMergeStatusTool, requestMergeTool } from '../webmcp/tools';
import { useSimulationStore } from '../stores/simulation-store';
import { useScenarioStore } from '../stores/scenario-store';

export function useWebMcp(): void {
  const stateVersion = useProcessStore((state) => state.stateVersion);
  const hasSimulation = useSimulationStore((state) => state.result !== null);
  const scenarios = useScenarioStore((state) => state.scenarios);
  const pendingMergeScenarioId = useScenarioStore((state) => state.pendingMergeScenarioId);
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
    const hasOpenScenario = scenarios.some((scenario) => scenario.status === 'open' && scenario.baseVersion >= stateVersion);
    const desiredTools = stateVersion > 0 ? [...coreTools, ...(hasSimulation ? [analyzeBottlenecksTool] : []), ...(useProcessStore.getState().process.nodes.length > 0 ? [forkScenarioTool] : []), ...(hasOpenScenario ? [compareScenariosTool, requestMergeTool, discardScenarioTool] : []), ...(pendingMergeScenarioId ? [getMergeStatusTool] : [])] : [];
    reconcileTools(desiredTools, registry, controller.signal);
  }, [hasSimulation, pendingMergeScenarioId, ready, scenarios, stateVersion]);

  useEffect(() => {
    if (typeof document !== 'undefined' && !('modelContext' in document)) {
      useTelemetryStore.getState().setSupport('unsupported');
    }
  }, []);
}
