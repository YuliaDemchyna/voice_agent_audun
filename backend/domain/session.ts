// Session state machine and tool semantics. This is where the hard rules live:
// the model can only *call* these tools; it cannot change state any other way.
// Pure: returns the next session, the events to append, and a result for the model.

import { COLLECTOR_NAME, type Claim, type Debtor } from "./claim.js";
import { addDays, todayInOslo } from "./dates.js";
import { checkOtp, issueOtp, type OtpConfig, type OtpState } from "./otp.js";
import { availableOptions, evaluatePlan, MAX_DAYS_TO_FIRST_PAYMENT, type ApprovedPlan } from "./policy.js";

export type SessionState =
  | "contacted"
  | "awaiting_code"
  | "verified"
  | "pending_confirmation"
  | "agreed"
  | "escalated"
  | "locked_out";

export const ESCALATION_REASONS = [
  "crisis",
  "hardship",
  "dispute",
  "requested_human",
  "contact_preference",
  "debt_adviser",
  "out_of_policy",
  "verification_failed",
  "recording_declined",
  "agent_error",
] as const;
export type EscalationReason = (typeof ESCALATION_REASONS)[number];

/** After these, negotiation and confirmation are disabled for the rest of the session (N5, E2, E8). */
export const LOCKING_REASONS: ReadonlySet<EscalationReason> = new Set([
  "crisis",
  "hardship",
  "dispute",
  "requested_human",
  "contact_preference",
  "debt_adviser",
  "verification_failed",
]);

export interface Escalation {
  reason: EscalationReason;
  summary: string;
  debtorQuote?: string;
}

export interface Session {
  id: string;
  debtor: Debtor;
  claim: Claim;
  state: SessionState;
  verified: boolean;
  otp?: OtpState;
  codesSent: number;
  approvedPlan?: ApprovedPlan;
  agreement?: ApprovedPlan & { agreedOn: string; confirmationQuote: string };
  escalations: Escalation[];
  negotiationLocked: boolean;
}

export type DomainEvent =
  | { type: "otp_sent"; to: string }
  | { type: "otp_verified" }
  | { type: "otp_failed"; reason: string; attemptsLeft: number }
  | { type: "claim_disclosed"; claimId: string }
  | { type: "plan_proposed"; proposal: unknown; approved: boolean; code?: string; plan?: ApprovedPlan }
  | { type: "agreement_recorded"; plan: ApprovedPlan; confirmationQuote: string }
  | { type: "escalated"; escalation: Escalation; locked: boolean }
  | { type: "contact_preference_recorded"; preference: string; callbackTime?: string }
  | { type: "sms_sent"; to: string; purpose: "otp" | "agreement_confirmation" | "escalation_note"; body: string }
  | { type: "tool_rejected"; tool: string; reason: string };

export interface ToolOutcome {
  session: Session;
  events: DomainEvent[];
  /** Returned to the model as the tool result. Never contains the OTP. */
  result: Record<string, unknown>;
}

export interface Context {
  now: number;
  otp: OtpConfig;
  random?: () => number;
}

export function newSession(id: string, debtor: Debtor, claim: Claim): Session {
  return { id, debtor, claim, state: "contacted", verified: false, codesSent: 0, escalations: [], negotiationLocked: false };
}

const MAX_CODES_SENT = 2;
const PAYMENT_ACCOUNT = "1503.12.34567"; // fictional
const CONTACT_PHONE = "+47 22 00 00 00"; // fictional

function rejected(session: Session, tool: string, reason: string, extra: Record<string, unknown> = {}): ToolOutcome {
  return { session, events: [{ type: "tool_rejected", tool, reason }], result: { ok: false, error: reason, ...extra } };
}

function phoneTail(phone: string): string {
  return phone.replace(/\D/g, "").slice(-3);
}

export function sendVerificationCode(session: Session, ctx: Context): ToolOutcome {
  if (session.verified) return rejected(session, "send_verification_code", "Identity is already verified.");
  if (session.state === "locked_out") return rejected(session, "send_verification_code", "Verification is locked after too many wrong codes.");
  if (session.codesSent >= MAX_CODES_SENT) {
    return rejected(session, "send_verification_code", "The code has already been resent once. Offer written contact instead.");
  }
  const otp = issueOtp(ctx.now, ctx.otp, ctx.random);
  const next: Session = { ...session, otp, codesSent: session.codesSent + 1, state: "awaiting_code" };
  return {
    session: next,
    events: [
      { type: "otp_sent", to: session.debtor.phone },
      { type: "sms_sent", to: session.debtor.phone, purpose: "otp", body: `Your ${COLLECTOR_NAME} verification code is ${otp.code}. It expires in ${Math.round(ctx.otp.ttlSeconds / 60)} minutes.` },
    ],
    result: { ok: true, message: `A 6-digit code was sent by SMS to the number ending in ${phoneTail(session.debtor.phone)}. Ask the person to read it out.` },
  };
}

export function verifyCode(session: Session, code: string, ctx: Context): ToolOutcome {
  if (session.verified) return { session, events: [], result: { ok: true, message: "Already verified." } };
  if (session.state === "locked_out") return rejected(session, "verify_code", "Verification is locked after too many wrong codes.");
  const { result, state } = checkOtp(session.otp, code, ctx.now, ctx.otp);
  if (result.ok) {
    return {
      session: { ...session, otp: state, verified: true, state: "verified" },
      events: [{ type: "otp_verified" }],
      result: { ok: true, message: "Identity verified. You may now call get_claim_details." },
    };
  }
  const next: Session = { ...session, otp: state };
  const events: DomainEvent[] = [{ type: "otp_failed", reason: result.reason, attemptsLeft: result.attemptsLeft }];
  if (result.reason === "locked") {
    const esc = escalate({ ...next, state: "locked_out" }, { reason: "verification_failed", summary: "Too many wrong verification codes." });
    return {
      session: esc.session,
      events: [...events, ...esc.events],
      result: { ok: false, error: "Too many wrong codes. Verification is locked. Do not discuss any details; explain that someone will follow up in writing, then end the call politely." },
    };
  }
  const hints: Record<string, string> = {
    mismatch: `The code didn't match. ${result.attemptsLeft} attempt(s) left.`,
    expired: "The code has expired. Offer to send a new one.",
    no_code_sent: "No code has been sent yet. Call send_verification_code first.",
  };
  return { session: next, events, result: { ok: false, error: hints[result.reason] } };
}

export function getClaimDetails(session: Session, ctx: Context): ToolOutcome {
  if (!session.verified) {
    return rejected(session, "get_claim_details", "Not verified. Do not reveal anything about why you are calling; verify the one-time code first.");
  }
  const today = todayInOslo(new Date(ctx.now));
  const c = session.claim;
  return {
    session,
    events: [{ type: "claim_disclosed", claimId: c.id }],
    result: {
      ok: true,
      claim: {
        reference: c.reference,
        creditor: c.creditor,
        description: c.description,
        original_due_date: c.originalDueDate,
        amount_owed_nok: c.amountNok,
        breakdown: { principal_nok: c.breakdown.principalNok, interest_and_fees_to_date_nok: c.breakdown.interestAndFeesNok },
        interest_note: "Interest and fees are frozen while an agreed plan is kept.",
      },
      today,
      latest_first_payment_date: addDays(today, MAX_DAYS_TO_FIRST_PAYMENT),
      options: availableOptions(c.amountNok, today),
    },
  };
}

export interface ProposeArgs {
  instalments: number;
  first_payment_date: string;
  total_amount_nok?: number;
}

export function proposePaymentPlan(session: Session, args: ProposeArgs, ctx: Context): ToolOutcome {
  if (!session.verified) return rejected(session, "propose_payment_plan", "Not verified.");
  if (session.negotiationLocked) return rejected(session, "propose_payment_plan", "Negotiation is closed for this call because the case was escalated. Do not discuss payment.");
  if (session.state === "agreed") return rejected(session, "propose_payment_plan", "An agreement is already recorded.");
  const today = todayInOslo(new Date(ctx.now));
  const policy = evaluatePlan(
    { instalments: args.instalments, firstPaymentDate: args.first_payment_date, totalAmountNok: args.total_amount_nok },
    session.claim.amountNok,
    today,
  );
  if (!policy.approved) {
    return {
      session: { ...session, approvedPlan: undefined, state: "verified" },
      events: [{ type: "plan_proposed", proposal: args, approved: false, code: policy.code }],
      result: { ok: false, approved: false, reason: policy.reason, available_options: policy.alternatives, note: "Explain the reason and the options. If the person still wants something else, offer human review (escalate with reason out_of_policy)." },
    };
  }
  return {
    session: { ...session, approvedPlan: policy.plan, state: "pending_confirmation" },
    events: [{ type: "plan_proposed", proposal: args, approved: true, plan: policy.plan }],
    result: { ok: true, approved: true, plan: policy.plan, next_step: "Read back every payment date and amount, then ask for a clear yes. Only after an explicit yes, call confirm_agreement with the same terms." },
  };
}

export interface ConfirmArgs {
  instalments: number;
  first_payment_date: string;
  debtor_confirmation_quote: string;
}

export function confirmAgreement(session: Session, args: ConfirmArgs, ctx: Context): ToolOutcome {
  if (!session.verified) return rejected(session, "confirm_agreement", "Not verified.");
  if (session.negotiationLocked) return rejected(session, "confirm_agreement", "Agreements can't be recorded after this escalation.");
  if (session.state === "agreed") return rejected(session, "confirm_agreement", "An agreement is already recorded.");
  const plan = session.approvedPlan;
  if (!plan || session.state !== "pending_confirmation") {
    return rejected(session, "confirm_agreement", "No approved plan is waiting for confirmation. Call propose_payment_plan first.");
  }
  if (plan.instalments !== args.instalments || plan.payments[0]?.dueDate !== args.first_payment_date) {
    return rejected(session, "confirm_agreement", "These terms don't match the approved plan. Read back the approved plan and confirm that.");
  }
  if (!args.debtor_confirmation_quote?.trim()) {
    return rejected(session, "confirm_agreement", "Include the person's exact words of confirmation.");
  }
  const agreedOn = todayInOslo(new Date(ctx.now));
  const lines = plan.payments.map((p) => `- ${p.dueDate}: NOK ${p.amountNok}`).join("\n");
  const body =
    `${COLLECTOR_NAME}: confirmation of your payment plan for ${session.claim.creditor}, ref ${session.claim.reference}.\n` +
    `${lines}\nTotal NOK ${plan.totalAmountNok}. Interest and fees are frozen while the plan is kept.\n` +
    `Pay to account ${PAYMENT_ACCOUNT}, reference ${session.claim.reference}.\n` +
    `If you have trouble paying or disagree with the claim, call us on ${CONTACT_PHONE}. Free debt advice: NAV, 55 55 33 39.`;
  return {
    session: { ...session, state: "agreed", agreement: { ...plan, agreedOn, confirmationQuote: args.debtor_confirmation_quote } },
    events: [
      { type: "agreement_recorded", plan, confirmationQuote: args.debtor_confirmation_quote },
      { type: "sms_sent", to: session.debtor.phone, purpose: "agreement_confirmation", body },
    ],
    result: { ok: true, message: "Agreement recorded. A written confirmation with every date and amount was sent by SMS. Thank the person and close the call." },
  };
}

export function escalate(session: Session, escalation: Escalation): ToolOutcome {
  const locked = LOCKING_REASONS.has(escalation.reason) || session.negotiationLocked;
  const body = session.verified
    ? `${COLLECTOR_NAME}: thank you for talking with us about ref ${session.claim.reference}. A member of our team will contact you within 1 week. Questions: ${CONTACT_PHONE}.`
    : `${COLLECTOR_NAME} tried to reach you about a personal matter. Please call us on ${CONTACT_PHONE}.`; // no claim details before verification (N1)
  const state: SessionState = session.state === "agreed" || session.state === "locked_out" ? session.state : "escalated";
  return {
    session: { ...session, state, negotiationLocked: locked, approvedPlan: locked ? undefined : session.approvedPlan, escalations: [...session.escalations, escalation] },
    events: [
      { type: "escalated", escalation, locked },
      { type: "sms_sent", to: session.debtor.phone, purpose: "escalation_note", body },
    ],
    result: { ok: true, message: "A person will follow up within 1 week, and a short note was sent by SMS. Tell the person that, then close the call kindly." + (locked ? " Do not discuss payment any further." : "") },
  };
}

export function recordContactPreference(session: Session, preference: "stop_contact" | "written_only" | "callback", callbackTime?: string): ToolOutcome {
  const pref: DomainEvent = { type: "contact_preference_recorded", preference, callbackTime };
  if (preference === "callback") {
    return { session, events: [pref], result: { ok: true, message: `Callback noted${callbackTime ? ` for ${callbackTime}` : ""}. Close the call politely.` } };
  }
  const esc = escalate(session, { reason: "contact_preference", summary: `Debtor asked for: ${preference}.` });
  return { ...esc, events: [pref, ...esc.events] };
}
