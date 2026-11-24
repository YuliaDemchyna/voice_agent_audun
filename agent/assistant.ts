// The Vapi assistant, defined in code (D1). Prompt and tool schemas come from
// the same sources the text-mode loop will use, so they can't drift.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toolJsonSchemas } from "../backend/conversation/tools.js";

/** Voice agent model (D2, changed 2026-11-24 for latency and price). Text mode uses the same one. */
export const DEFAULT_AGENT_MODEL = "claude-haiku-4-5-20251001";

export const FIRST_MESSAGE =
  "Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, just say so. Am I speaking with Ola Nordmann?";

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
          // Empty request-start replaces Vapi's default filler ("This will just take a sec").
          // Verified: https://docs.vapi.ai/tools/custom-tools
          messages: [{ type: "request-start", content: "" }],
        })),
        { type: "endCall" },
      ],
    },
    // Female voice, perceived as less threatening here. Vapi's own "Clara" replaced
    // ElevenLabs "sarah", which sounded awkward in live calls (D6).
    voice: { provider: "vapi", voiceId: process.env.VAPI_VOICE_ID ?? "Clara", version: "2", language: "en" },
    server: { ...server, timeoutSeconds: 20 },
    // Vapi's post-call summary and success evaluation are off: the event log, tickets
    // and our own judge are the record of the call.
    analysisPlan: { summaryPlan: { enabled: false }, successEvaluationPlan: { enabled: false } },
    serverMessages: ["tool-calls", "status-update", "end-of-call-report"],
    endCallMessage: "Thank you, goodbye.",
  };
}
