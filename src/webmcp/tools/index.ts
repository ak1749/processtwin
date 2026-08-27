import type { ToolDef } from '../types';
import { batchMutateProcessTool } from './batch-mutate-process';
import { connectStepsTool } from './connect-steps';
import { createStepTool } from './create-step';
import { deleteStepTool } from './delete-step';
import { getChangesSinceTool } from './get-changes-since';
import { getProcessGraphTool } from './get-process-graph';
import { getProcessSummaryTool } from './get-process-summary';
import { updateConnectionTool } from './update-connection';
import { updateStepTool } from './update-step';
import { simulateProcessTool } from './simulate-process';
import { validateProcessTool } from './validate-process';
import { analyzeBottlenecksTool } from './analyze-bottlenecks';

export const coreTools: ToolDef[] = [
  getProcessSummaryTool,
  getProcessGraphTool,
  getChangesSinceTool,
  batchMutateProcessTool,
  createStepTool,
  updateStepTool,
  connectStepsTool,
  updateConnectionTool,
  deleteStepTool,
  validateProcessTool,
  simulateProcessTool,
];

export { analyzeBottlenecksTool };
