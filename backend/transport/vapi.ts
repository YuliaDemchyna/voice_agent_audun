// Vapi transport: translates Vapi server messages into tool calls on our
// backend. Holds no business logic (see docs/research/vapi.md for shapes).

import type { Context as HonoContext } from "hono";
import { runTool } from "../services/runtime.js";
import type { Store } from "../services/store.js";

interface VapiToolCall {
  id: string;
  function: { name: string; arguments: unknown };
}

interface VapiMessage {
  type: string;
  call?: { id?: string; metadata?: { sessionId?: string }; assistantOverrides?: { variableValues?: { sessionId?: string } } };
  toolCallList?: VapiToolCall[];
  endedReason?: string;
  status?: string;
  summary?: string;
}

function resolveSessionId(store: Store, msg: VapiMessage): string | undefined {
  // One debtor at a time (A1): fall back to the active session if the call carries no id.
  return msg.call?.assistantOverrides?.variableValues?.sessionId ?? msg.call?.metadata?.sessionId ?? store.getActiveSessionId();
}

export function vapiWebhook(store: Store) {
  return async (c: HonoContext) => {
    const secret = process.env.VAPI_WEBHOOK_SECRET;
    if (secret && c.req.header("x-vapi-secret") !== secret) return c.json({ error: "unauthorised" }, 401);

    const body = (await c.req.json()) as { message?: VapiMessage };
    const msg = body.message;
    if (!msg) return c.json({});
    const sessionId = resolveSessionId(store, msg);

    if (msg.type === "tool-calls") {
      const results = (msg.toolCallList ?? []).map((tc) => {
        const result = sessionId
          ? runTool(store, sessionId, tc.function.name, tc.function.arguments, "vapi")
          : { ok: false, error: "No active session. Start a contact in the UI first." };
        return { toolCallId: tc.id, result: JSON.stringify(result) };
      });
      return c.json({ results });
    }

    if (sessionId && msg.type === "status-update") {
      store.appendEvents(sessionId, [{ type: "call_status", status: msg.status ?? null, callId: msg.call?.id ?? null }]);
    }
    if (sessionId && msg.type === "end-of-call-report") {
      store.appendEvents(sessionId, [{ type: "call_ended", endedReason: msg.endedReason ?? null, summary: msg.summary ?? null }]);
    }
    return c.json({});
  };
}
