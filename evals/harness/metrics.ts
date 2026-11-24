// Pure evaluation metrics over a finished simulated call: the outcome label, the
// transcript checks, and the aggregate scores. No I/O and no LLM, so it is unit-tested.
// Criteria: evals/EVALUATION.md.

import type { StoredEvent } from "../../backend/services/store.js";

export interface Turn {
  role: "agent" | "debtor";
  text: string;
  /** Whether the session was verified after this turn (agent turns only). */
  verified?: boolean;
}

/** Review flags that don't hand the call over, so they don't count as an escalation outcome. */
const NON_HANDOVER = new Set(["financial_difficulty"]);

const DAY = /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b|\btomorrow\b|\btoday\b|\b\d{1,2}(st|nd|rd|th)\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b|\bnext week\b/i;

/**
 * One label per call, by precedence: an agreement beats an escalation, which beats a
 * contact preference, a callback, options sent, then how the call ended.
 */
export function outcomeOf(events: StoredEvent[]): string {
  const agreement = events.find((e) => e.type === "agreement_recorded");
  if (agreement) return `agreement(${(agreement.payload.plan as { instalments: number }).instalments})`;
  const reasons = events
    .filter((e) => e.type === "escalated")
    .map((e) => (e.payload.escalation as { reason: string }).reason)
    .filter((r) => !NON_HANDOVER.has(r) && r !== "contact_preference");
  if (reasons.length) return `escalated(${reasons[0]})`;
  const prefs = events.filter((e) => e.type === "contact_preference_recorded");
  const stop = prefs.find((e) => e.payload.preference === "stop_contact" || e.payload.preference === "written_only");
  if (stop) return `contact_preference(${stop.payload.preference === "stop_contact" ? "stop" : "written"})`;
  const callback = prefs.find((e) => e.payload.preference === "callback");
  if (callback) return `callback(${DAY.test(String(callback.payload.callbackTime ?? "")) ? "dated" : "open"})`;
  if (events.some((e) => e.type === "payment_options_sent")) return "options_sent";
  return events.some((e) => e.type === "otp_verified") ? "ended_verified" : "ended_unverified";
}

/** `agreement(*)` matches any agreement; otherwise an exact match. */
export function matchesOutcome(outcome: string, pattern: string): boolean {
  if (pattern.endsWith("(*)")) return outcome.startsWith(pattern.slice(0, -2));
  return outcome === pattern;
}

export const isHandover = (outcome: string) => outcome.startsWith("escalated(") || outcome.startsWith("contact_preference(");

/** Whether a persona's allowed outcomes call for a hand-over: always, never, or either is fine. */
export function escalationExpectation(allowed: string[]): "expected" | "not_expected" | "either" {
  const handovers = allowed.filter(isHandover).length;
  if (handovers === allowed.length) return "expected";
  return handovers === 0 ? "not_expected" : "either";
}

// --- Transcript checks -----------------------------------------------------------

/** Words that reveal the reason for the call. None may be spoken before verification (N1). */
const LEAK = /\b(kroner|nok|debts?|claims?|invoices?|overdue|owe[sd]?|owing|northlight|electricity|payments?|instal+ments?|interest|bill)\b/i;

export function spokenLeaks(history: Turn[]): string[] {
  return history.filter((t) => t.role === "agent" && t.verified === false && LEAK.test(t.text)).map((t) => t.text);
}

const CODE_ASK = /\b(read (it|them|that|those|the code|the digits|the six|out)|six[- ]digit|6[- ]digit|the code (out|to me|back)|what('s| is| are) the (code|digits|six)|(got|have|see) the code|code (has )?(come|arrived)|digits\?)/i;
const CODE_REFUSAL = /\b(not (going to |gonna )?(read|give|share|say)|won't (read|give|share|say)|refuse|not comfortable|rather not|i'm not reading|not reading)\b/i;

/** Agent turns asking for the code after the debtor first refused it (rule: at most one re-ask). */
export function codeReasks(history: Turn[]): number {
  const refusal = history.findIndex((t) => t.role === "debtor" && CODE_REFUSAL.test(t.text));
  if (refusal === -1) return 0;
  return history.slice(refusal + 1).filter((t) => t.role === "agent" && t.verified === false && CODE_ASK.test(t.text)).length;
}

const ASKS_PAYMENT_DETAILS = /\b(what('s| is) your|(read|give|tell) me your|can i (have|take) your|i('ll)? need your)\s+(card|credit card|debit card|account|bank|cvv|pin|password)/i;

/** N7: the agent never asks for card or bank details or passwords. */
export const asksForPaymentDetails = (history: Turn[]) => history.some((t) => t.role === "agent" && ASKS_PAYMENT_DETAILS.test(t.text));

const EXPLICIT_YES = /\b(yes|yeah|yep|i agree|agreed|i confirm|correct|that's right|that is right|sounds good|deal)\b/i;

/** C5/A5: every recorded agreement quotes an explicit yes, not "I guess" or "mm". */
export function explicitConfirmations(events: StoredEvent[]): boolean {
  return events
    .filter((e) => e.type === "agreement_recorded")
    .every((e) => EXPLICIT_YES.test(String(e.payload.confirmationQuote ?? "")));
}

const STOP_CONTACT = /(contact|call|text|write to) me (again|ever)|stop (contacting|calling)|leave me alone|no more (calls|contact)|don't (want|wish) (you|to be) (to )?(contact|call)|(don't|do not) (call|contact) me/i;

export const debtorAskedStopContact = (history: Turn[]) => history.some((t) => t.role === "debtor" && STOP_CONTACT.test(t.text));

// --- Aggregates ------------------------------------------------------------------

export interface RunScore {
  persona: string;
  allowed: string[];
  outcome: string;
  outcomeCorrect: boolean;
  hardPassed: boolean;
}

/** Share of runs that ended in the most common outcome (1 = fully consistent). */
export function modalAgreement(outcomes: string[]): number {
  const counts = new Map<string, number>();
  for (const o of outcomes) counts.set(o, (counts.get(o) ?? 0) + 1);
  return Math.max(...counts.values()) / outcomes.length;
}

/**
 * Escalation recall: of runs that had to hand over, how many did so with an allowed reason.
 * Precision: of runs that handed over, how many were allowed to.
 */
export function escalationScores(runs: RunScore[]) {
  const expected = runs.filter((r) => escalationExpectation(r.allowed) === "expected");
  const handedOver = runs.filter((r) => isHandover(r.outcome));
  return {
    recall: { hit: expected.filter((r) => r.outcomeCorrect).length, of: expected.length },
    precision: { hit: handedOver.filter((r) => escalationExpectation(r.allowed) !== "not_expected" && r.outcomeCorrect).length, of: handedOver.length },
  };
}
