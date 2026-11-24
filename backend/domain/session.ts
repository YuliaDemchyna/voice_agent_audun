// Session state machine and tool semantics. This is where the hard rules live:
// the model can only *call* these tools; it cannot change state any other way.
// Pure: returns the next session, the events to append, and a result for the model.

import { COLLECTOR_NAME, type Claim, type Debtor } from "./claim.js";
import { addDays, formatDate, todayInOslo } from "./dates.js";
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
  "financial_difficulty",
  "dispute",
  "requested_human",
  "contact_preference",
  "debt_adviser",
  "out_of_policy",
  "verification_failed",
  "recording_declined",
  "complaint",
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
  "recording_declined",
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
  | { type: "payment_options_sent" }
  | { type: "sms_sent"; to: string; purpose: "otp" | "agreement_confirmation" | "escalation_note" | "payment_options"; body: string }
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
      events: [{ type: "otp_verified" }, { type: "claim_disclosed", claimId: session.claim.id }],
      result: { ok: true, message: "Identity verified. The claim details are below; you may now explain them.", ...claimPayload(session, ctx) },
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

function claimPayload(session: Session, ctx: Context) {
  const today = todayInOslo(new Date(ctx.now));
  const c = session.claim;
  return {
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
  };
}

export function getClaimDetails(session: Session, ctx: Context): ToolOutcome {
  if (!session.verified) {
    return rejected(session, "get_claim_details", "Not verified. Do not reveal anything about why you are calling; verify the one-time code first.");
  }
  return { session, events: [{ type: "claim_disclosed", claimId: session.claim.id }], result: { ok: true, ...claimPayload(session, ctx) } };
}

/** Principle 5: "not now" is fine, so the options can always go out in writing (verified only). */
export function sendPaymentOptions(session: Session, ctx: Context): ToolOutcome {
  if (!session.verified) return rejected(session, "send_payment_options", "Not verified.");
  if (session.negotiationLocked) return rejected(session, "send_payment_options", "Payment options can't be sent after this escalation.");
  const today = todayInOslo(new Date(ctx.now));
  const c = session.claim;
  const latest = formatDate(addDays(today, MAX_DAYS_TO_FIRST_PAYMENT));
  const body =
    `${COLLECTOR_NAME}: ${c.description} from ${c.creditor} (ref ${c.reference}) was due on ${formatDate(c.originalDueDate)}. Amount owed: NOK ${c.amountNok}.\n` +
    `Ways to pay, first payment by ${latest}:\n` +
    `- all at once: NOK ${c.amountNok}\n- 2 monthly payments of NOK ${c.amountNok / 2}\n- 3 monthly payments of NOK ${c.amountNok / 3}\n` +
    `If you agree a plan with us, interest and fees stop while you keep to it. To agree a plan or ask a question, call ${CONTACT_PHONE}. Free debt advice: NAV, 55 55 33 39.`;
  return {
    session,
    events: [{ type: "payment_options_sent" }, { type: "sms_sent", to: session.debtor.phone, purpose: "payment_options", body }],
    result: { ok: true, message: "The payment options were sent by SMS. Tell them they can take their time and call back when ready." },
  };
}

export interface ProposeArgs {
  instalments: number;
  first_payment_date: string;
  total_amount_nok?: number;
  /** Required in the tool schema, so the model answers it on every proposal (a separate escalate call was skipped 1 run in 3). */
  money_trouble_mentioned?: boolean;
}

/** E2 split: a plan agreed under money trouble is flagged for a person to check affordability. The backend raises the flag, not the model. */
export function proposePaymentPlan(session: Session, args: ProposeArgs, ctx: Context): ToolOutcome {
  const alreadyFlagged = session.escalations.some((e) => e.reason === "financial_difficulty" || e.reason === "hardship");
  if (args.money_trouble_mentioned && !alreadyFlagged && session.verified && !session.negotiationLocked) {
    const escalation: Escalation = { reason: "financial_difficulty", summary: "Plan proposed after the person mentioned money trouble; check affordability." };
    const flagged = { ...session, escalations: [...session.escalations, escalation] };
    const out = proposePlanChecked(flagged, args, ctx);
    return { ...out, events: [{ type: "escalated", escalation, locked: false }, ...out.events] };
  }
  return proposePlanChecked(session, args, ctx);
}

function proposePlanChecked(session: Session, args: ProposeArgs, ctx: Context): ToolOutcome {
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
  const lines = plan.payments.map((p) => `- ${formatDate(p.dueDate)}: NOK ${p.amountNok}`).join("\n");
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

const ESCALATION_SCRIPT: Partial<Record<EscalationReason, { say: string; sms: (s: Session) => string }>> = {
  contact_preference: {
    say: "Say, in your own words but keeping the meaning: \"I understand, and I've noted it. We'll follow up with a written message, because the claim is still open. If you think this claim is wrong, please reply in writing. Have a good day.\" Then end the call.",
    sms: (s) => `${COLLECTOR_NAME}: we have noted your request not to be called about ref ${s.claim.reference}. Because the claim is still open, we will follow up in writing. If you think this claim is wrong, please reply in writing. Questions: ${CONTACT_PHONE}.`,
  },
  recording_declined: {
    say: "Say exactly this, in full: \"Of course. I'm an AI assistant, so I can't handle this call without recording. A person from our team will be in touch with you instead.\" Do not mention the reason for the call and do not say goodbye yourself. Only after you have said it, end the call.",
    sms: () => `${COLLECTOR_NAME}: thank you for your time. A colleague will contact you without recording. You can also call us on ${CONTACT_PHONE}.`,
  },
  complaint: {
    say: "Acknowledge the complaint without being defensive. Say a person will look at it and reply within a week. Ask if there's anything else they want them to know.",
    sms: (s) => `${COLLECTOR_NAME}: we have received your complaint${s.verified ? ` about ref ${s.claim.reference}` : ""}. A person will look at it and reply within 1 week. Questions: ${CONTACT_PHONE}.`,
  },
  crisis: {
    say: "Stay calm and kind. Mention Mental Helse's helpline, 116 123. Tell them a person from the team will reach out, and do not talk about the claim.",
    sms: () => `${COLLECTOR_NAME}: thank you for talking with us. A member of our team will be in touch. If you need someone to talk to now, Mental Helse's helpline is 116 123.`,
  },
  hardship: {
    say: "Tell them a person from the team will contact them within a week and nothing needs to be decided today. Mention NAV's free debt advice and give the number in words: fifty-five, fifty-five, thirty-three, thirty-nine (it is also in the text you just sent). Ask if there's a good time or way to reach them.",
    sms: (s) => `${COLLECTOR_NAME}: thank you for talking with us about ref ${s.claim.reference}. Nothing needs to be decided now; a member of our team will contact you within 1 week. Free debt advice: NAV, 55 55 33 39.`,
  },
};

/**
 * Money trouble without vulnerability signs (can't pay it all at once, job loss, tight budget).
 * Not locking: the agent may still agree a plan, but a person reviews its affordability.
 * No SMS and no state change, so the call can go on to a plan.
 */
function flagFinancialDifficulty(session: Session, escalation: Escalation): ToolOutcome {
  return {
    session: { ...session, escalations: [...session.escalations, escalation] },
    events: [{ type: "escalated", escalation, locked: false }],
    result: {
      ok: true,
      message:
        "Flagged for a person to review affordability; the call continues. Acknowledge it warmly and say you're here to figure this out with them. " +
        "Then suggest three monthly payments of one thousand kroner as the easiest option, mention that interest and fees stop while they keep to an agreed plan, " +
        "and ask once whether one thousand a month would be manageable. If yes, propose that plan. If they can't commit, call escalate with reason hardship.",
    },
  };
}

export function escalate(session: Session, escalation: Escalation): ToolOutcome {
  if (escalation.reason === "financial_difficulty") return flagFinancialDifficulty(session, escalation);
  const locked = LOCKING_REASONS.has(escalation.reason) || session.negotiationLocked;
  const script = ESCALATION_SCRIPT[escalation.reason];
  const body = escalation.reason === "recording_declined" && script
    ? script.sms(session) // says nothing about the claim, so safe before verification
    : !session.verified
    ? `${COLLECTOR_NAME} tried to reach you about a personal matter. Please call us on ${CONTACT_PHONE}.` // nothing before verification (N1)
    : script
      ? script.sms(session)
      : `${COLLECTOR_NAME}: thank you for talking with us about ref ${session.claim.reference}. A member of our team will contact you within 1 week. Questions: ${CONTACT_PHONE}.`;
  const say = script?.say ?? "Tell them a person will follow up within a week and a short note was sent by SMS, then close the call kindly.";
  const state: SessionState = session.state === "agreed" || session.state === "locked_out" ? session.state : "escalated";
  return {
    session: { ...session, state, negotiationLocked: locked, approvedPlan: locked ? undefined : session.approvedPlan, escalations: [...session.escalations, escalation] },
    events: [
      { type: "escalated", escalation, locked },
      { type: "sms_sent", to: session.debtor.phone, purpose: "escalation_note", body },
    ],
    result: { ok: true, message: say + (locked ? " Do not discuss payment any further." : "") },
  };
}

/**
 * An escalation for another reason can come with a stop-contact request in the same breath
 * ("this isn't mine, and don't contact me again"). The tool makes the model answer
 * contact_preference_requested on every escalation, and the backend records it here,
 * because a separate record_contact_preference call was skipped (sim run 14).
 */
export function escalateWithContactPreference(
  session: Session,
  escalation: Escalation,
  preference: "none" | "stop_contact" | "written_only",
): ToolOutcome {
  const out = escalate(session, escalation);
  if (preference === "none" || escalation.reason === "contact_preference") return out;
  const pref: Escalation = { reason: "contact_preference", summary: `Debtor asked for: ${preference}.`, debtorQuote: escalation.debtorQuote };
  const script = ESCALATION_SCRIPT.contact_preference!;
  return {
    session: { ...out.session, negotiationLocked: true, approvedPlan: undefined, escalations: [...out.session.escalations, pref] },
    events: [...out.events, { type: "contact_preference_recorded", preference }, { type: "escalated", escalation: pref, locked: true }],
    result: { ok: true, message: `${String(out.result.message)} They also asked for ${preference === "stop_contact" ? "no more contact" : "written contact only"}, which is now recorded. ${script.say}` },
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
