// The Vapi assistant, defined in code (D1). Prompt and tool schemas come from
// the same sources the text-mode loop will use, so they can't drift.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toolJsonSchemas } from "../backend/conversation/tools.js";

export const FIRST_MESSAGE =
  "Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality. Am I speaking with Ola Nordmann?";

export function systemPrompt(): string {
  return readFileSync(fileURLToPath(new URL("./prompt.md", import.meta.url)), "utf8");
}

export function assistantConfig(opts: { serverUrl: string; model: string; secret?: string }) {
  const server = { url: `${opts.serverUrl.replace(/\/$/, "")}/vapi/webhook`, ...(opts.secret ? { secret: opts.secret } : {}) };
  return {
    name: "Nordvik collections agent",
    firstMessage: FIRST_MESSAGE,
    model: {
      provider: "anthropic",
      model: opts.model,
      messages: [{ role: "system", content: systemPrompt() }],
      tools: [
        ...toolJsonSchemas().map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters },
          server,
        })),
        { type: "endCall" },
      ],
    },
    server,
    serverMessages: ["tool-calls", "status-update", "end-of-call-report"],
    endCallMessage: "Thank you, goodbye.",
  };
}
