import { recordToolTelemetry, setWebMcpSupport, syncRegisteredToolNames } from '../stores/telemetry-store';
import type { ToolDef } from './types';

export interface ToolRegistry {
  names: Set<string>;
}

function modelContext() {
  if (typeof document === 'undefined' || !('modelContext' in document)) return null;
  return document.modelContext;
}

function syncRegisteredTools(registry: ToolRegistry): void {
  syncRegisteredToolNames(Array.from(registry.names).sort());
}

export function registerTool(tool: ToolDef, registry: ToolRegistry, signal: AbortSignal): boolean {
  const mc = modelContext();
  if (!mc || registry.names.has(tool.name)) return false;

  try {
    document.modelContext.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      execute: async (input: unknown) => {
        const envelope = await tool.run(input);
        recordToolTelemetry(tool.name, envelope, input);
        return { content: [{ type: 'text', text: JSON.stringify(envelope) }] };
      },
    });
    registry.names.add(tool.name);
    syncRegisteredTools(registry);
    signal.addEventListener('abort', () => {
      if (!registry.names.delete(tool.name)) return;
      try {
        mc.unregisterTool(tool.name);
      } catch {
        // The browser may have already released the model context.
      }
      syncRegisteredTools(registry);
    }, { once: true });
    return true;
  } catch {
    return false;
  }
}

export function unregisterTool(name: string, registry: ToolRegistry): void {
  const mc = modelContext();
  if (!mc || !registry.names.delete(name)) return;
  try {
    mc.unregisterTool(name);
  } catch {
    // The browser may have already released the model context.
  }
  syncRegisteredTools(registry);
}

export function registerTools(tools: ToolDef[], signal: AbortSignal): ToolRegistry {
  const registry: ToolRegistry = { names: new Set<string>() };
  setWebMcpSupport(modelContext() ? 'supported' : 'unsupported');
  for (const tool of tools) registerTool(tool, registry, signal);
  return registry;
}
