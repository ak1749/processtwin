"use client";

import { useEffect, useState } from "react";

export function WebMcpSmoke() {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!("modelContext" in document)) {
      return;
    }

    const controller = new AbortController();
    controller.signal.addEventListener("abort", () => {
      try {
        document.modelContext.unregisterTool("ping");
      } catch {
        // The browser may have already released the model context.
      }
    });

    try {
      document.modelContext.registerTool({
        name: "ping",
        description:
          "Returns pong with the message you send. Use this to confirm ProcessTwin's WebMCP tools are reachable.",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: ["message"],
        },
        execute: async ({ message }) => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, echo: message }),
            },
          ],
        }),
      });
      setIsRegistered(true);
    } catch {
      setIsRegistered(false);
    }

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <p>
      {isRegistered
        ? "WebMCP detected — 1 tool registered"
        : "WebMCP not detected"}
    </p>
  );
}
