// Applies a tool call to a stored session: load, run domain logic, persist, log.

import { randomUUID } from "node:crypto";
import { demoClaim, demoDebtor } from "../domain/claim.js";
import { newSession, type Context, type Session } from "../domain/session.js";
import { dispatchTool } from "../conversation/tools.js";
import type { Store } from "./store.js";

export function otpConfig() {
  return {
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 3),
  };
}

export function startSession(store: Store): Session {
  const session = newSession(`ses_${randomUUID().slice(0, 8)}`, demoDebtor, demoClaim);
  store.saveSession(session);
  store.setActiveSession(session.id);
  store.appendEvents(session.id, [{ type: "session_started", debtorId: demoDebtor.id, claimId: demoClaim.id }]);
  return session;
}

export function runTool(store: Store, sessionId: string, name: string, args: unknown, source: string) {
  const session = store.getSession(sessionId);
  if (!session) return { ok: false, error: `Unknown session ${sessionId}` };
  const ctx: Context = { now: Date.now(), otp: otpConfig() };
  let outcome;
  try {
    outcome = dispatchTool(session, name, args, ctx);
  } catch (err) {
    store.appendEvents(sessionId, [{ type: "tool_error", tool: name, message: String(err) }]);
    return { ok: false, error: "Internal error. Apologise and offer to have a person follow up." };
  }
  store.saveSession(outcome.session);
  store.appendEvents(sessionId, [{ type: "tool_called", tool: name, args, source, result: outcome.result }, ...outcome.events]);
  return outcome.result;
}
