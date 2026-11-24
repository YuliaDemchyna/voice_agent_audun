// Builds the reviewer ticket (docs/escalation.md) from session state and the
// event log. Facts come from the backend; only `agent_summary` is model-written.

import type { Session } from "../domain/session.js";
import type { StoredEvent } from "./store.js";

const PRIORITY: Record<string, string> = {
  crisis: "P0",
  hardship: "P1",
  financial_difficulty: "P3",
  dispute: "P2",
  requested_human: "P2",
  complaint: "P2",
  contact_preference: "P2",
  agent_error: "P2",
  debt_adviser: "P3",
  out_of_policy: "P3",
  verification_failed: "P3",
  recording_declined: "P3",
};

export function buildTickets(session: Session, events: StoredEvent[]) {
  const attempted = events
    .filter((e) => e.type === "plan_proposed")
    .map((e) => ({ type: "plan_proposed", terms: e.payload.proposal, policy_result: e.payload.approved ? "approved" : "rejected", reason: e.payload.code ?? null }));
  const failedAttempts = events.filter((e) => e.type === "otp_failed").length;
  const verifiedAt = events.find((e) => e.type === "otp_verified")?.ts ?? null;
  const preference = [...events].reverse().find((e) => e.type === "contact_preference_recorded")?.payload ?? null;

  return events
    .filter((e) => e.type === "escalated")
    .map((e) => {
      const esc = e.payload.escalation as { reason: string; summary: string; debtorQuote?: string };
      return {
        ticket_id: `esc_${session.id}_${e.seq}`,
        created_at: e.ts,
        reason: esc.reason,
        priority: PRIORITY[esc.reason] ?? "P2",
        debtor: session.debtor,
        identity: { verified: session.verified, method: "sms_otp", verified_at: verifiedAt, failed_attempts: failedAttempts },
        claim: session.verified
          ? { id: session.claim.id, reference: session.claim.reference, creditor: session.claim.creditor, amount_nok: session.claim.amountNok, status: e.payload.locked ? "paused_pending_review" : "open" }
          : "not disclosed (identity not verified)",
        debtor_request: { quote: esc.debtorQuote ?? null },
        attempted,
        promised_to_debtor: "A person will contact you within 1 week.",
        contact_preference: preference,
        agent_summary: esc.summary,
        transcript_url: `/api/sessions/${session.id}`,
      };
    });
}
