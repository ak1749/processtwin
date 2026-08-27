interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: {
      message: { type: "string" };
    };
    required: ["message"];
  };
  execute: (input: { message: string }) => Promise<{
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
