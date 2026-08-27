import { registerTool, unregisterTool, type ToolRegistry } from './register';
import type { ToolDef } from './types';

export function reconcileTools(
  desiredTools: ToolDef[],
  registry: ToolRegistry,
  signal: AbortSignal,
): void {
  const desiredByName = new Map(desiredTools.map((tool) => [tool.name, tool]));
  for (const name of Array.from(registry.names)) {
    if (!desiredByName.has(name)) unregisterTool(name, registry);
  }
  for (const tool of desiredTools) {
    if (!registry.names.has(tool.name)) registerTool(tool, registry, signal);
  }
}
