interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
  execute: (input: unknown) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
}

interface ModelContext {
  registerTool(tool: ModelContextTool): void;
  unregisterTool(name: string): void;
}

interface Document {
  readonly modelContext: ModelContext;
}
