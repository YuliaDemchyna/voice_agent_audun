import { describe, expect, it } from "vitest";
import { demoClaim, demoDebtor } from "./claim.js";
import {
  confirmAgreement,
  escalate,
  escalateWithContactPreference,
  getClaimDetails,
  newSession,
  proposePaymentPlan,
  recordContactPreference,
  sendPaymentOptions,
  sendVerificationCode,
  verifyCode,
  type Context,
  type Session,
} from "./session.js";

const NOW = Date.parse("2026-11-24T12:00:00+01:00");
const ctx: Context = { now: NOW, otp: { ttlSeconds: 300, maxAttempts: 3 }, random: () => 0.123456 };
const CODE = "123456";

function verified(): Session {
  let s = newSession("ses_1", demoDebtor, demoClaim);
  s = sendVerificationCode(s, ctx).session;
  return verifyCode(s, CODE, ctx).session;
}

describe("verification gate (C2, N1, N8)", () => {
  it("refuses claim details before verification and leaks nothing", () => {
    const s = newSession("ses_1", demoDebtor, demoClaim);
    const out = getClaimDetails(s, ctx);
    expect(out.result.ok).toBe(false);
    expect(JSON.stringify(out.result)).not.toMatch(/3000|Lysverk|NV-2026/);
  });

  it("never returns the code to the model", () => {
    const out = sendVerificationCode(newSession("ses_1", demoDebtor, demoClaim), ctx);
    expect(JSON.stringify(out.result)).not.toContain(CODE);
    expect(out.events).toContainEqual(expect.objectContaining({ type: "sms_sent", purpose: "otp" }));
  });

  it("discloses the claim only after the correct code", () => {
    let s = sendVerificationCode(newSession("ses_1", demoDebtor, demoClaim), ctx).session;
    expect(verifyCode(s, "000000", ctx).result.ok).toBe(false);
    s = verifyCode(s, "1 2 3 4 5 6", ctx).session;
    expect(getClaimDetails(s, ctx).result.ok).toBe(true);
  });

  it("rejects an expired code", () => {
    const s = sendVerificationCode(newSession("ses_1", demoDebtor, demoClaim), ctx).session;
    expect(verifyCode(s, CODE, { ...ctx, now: NOW + 301_000 }).result.ok).toBe(false);
  });

  it("locks out and escalates after 3 wrong codes, with a note that reveals nothing (E6)", () => {
    let s = sendVerificationCode(newSession("ses_1", demoDebtor, demoClaim), ctx).session;
    let out = verifyCode(s, "111111", ctx);
    out = verifyCode(out.session, "222222", ctx);
    out = verifyCode(out.session, "333333", ctx);
    expect(out.session.state).toBe("locked_out");
    expect(verifyCode(out.session, CODE, ctx).result.ok).toBe(false);
    const note = out.events.find((e) => e.type === "sms_sent" && e.purpose === "escalation_note");
    expect(note && "body" in note && note.body).not.toMatch(/3000|Lysverk|NV-2026/);
  });
});

describe("agreement (C5, N2, N3)", () => {
  it("records an approved plan only after confirmation with matching terms, then sends the written confirmation", () => {
    let s = verified();
    s = proposePaymentPlan(s, { instalments: 3, first_payment_date: "2026-12-05" }, ctx).session;
    expect(s.state).toBe("pending_confirmation");
    expect(confirmAgreement(s, { instalments: 2, first_payment_date: "2026-12-05", debtor_confirmation_quote: "yes" }, ctx).result.ok).toBe(false);
    const out = confirmAgreement(s, { instalments: 3, first_payment_date: "2026-12-05", debtor_confirmation_quote: "Yes, that works." }, ctx);
    expect(out.session.state).toBe("agreed");
    const sms = out.events.find((e) => e.type === "sms_sent" && e.purpose === "agreement_confirmation");
    expect(sms && "body" in sms && sms.body).toMatch(/5 December 2026: NOK 1000[\s\S]*5 January 2027: NOK 1000[\s\S]*5 February 2027: NOK 1000/);
  });

  it("cannot confirm without an approved proposal", () => {
    const out = confirmAgreement(verified(), { instalments: 1, first_payment_date: "2026-12-01", debtor_confirmation_quote: "yes" }, ctx);
    expect(out.result.ok).toBe(false);
    expect(out.session.state).toBe("verified");
  });

  it("cannot confirm after a rejected proposal (no out-of-policy plan is ever recorded)", () => {
    let s = verified();
    s = proposePaymentPlan(s, { instalments: 2, first_payment_date: "2026-12-05" }, ctx).session;
    s = proposePaymentPlan(s, { instalments: 6, first_payment_date: "2026-12-05" }, ctx).session;
    expect(confirmAgreement(s, { instalments: 2, first_payment_date: "2026-12-05", debtor_confirmation_quote: "yes" }, ctx).result.ok).toBe(false);
  });
});

describe("escalation locks (N5, E1, E5)", () => {
  it("disables negotiation and confirmation after a dispute", () => {
    let s = verified();
    s = proposePaymentPlan(s, { instalments: 1, first_payment_date: "2026-12-01" }, ctx).session;
    s = escalate(s, { reason: "dispute", summary: "Says it was paid." }).session;
    expect(proposePaymentPlan(s, { instalments: 1, first_payment_date: "2026-12-01" }, ctx).result.ok).toBe(false);
    expect(confirmAgreement(s, { instalments: 1, first_payment_date: "2026-12-01", debtor_confirmation_quote: "yes" }, ctx).result.ok).toBe(false);
  });

  it("does not lock negotiation for an out-of-policy review request", () => {
    const s = escalate(verified(), { reason: "out_of_policy", summary: "Wants 6 instalments." }).session;
    expect(proposePaymentPlan(s, { instalments: 3, first_payment_date: "2026-12-01" }, ctx).result.ok).toBe(true);
  });

  it("financial difficulty flags for review but still allows a plan (E2 split)", () => {
    const out = escalate(verified(), { reason: "financial_difficulty", summary: "Lost hours at work; can't pay it all at once." });
    expect(out.session.negotiationLocked).toBe(false);
    expect(out.events.some((e) => e.type === "sms_sent")).toBe(false);
    expect(out.session.escalations.map((e) => e.reason)).toContain("financial_difficulty");
    expect(proposePaymentPlan(out.session, { instalments: 3, first_payment_date: "2026-12-01" }, ctx).result.ok).toBe(true);
  });

  it("a plan proposed under money trouble raises the review flag once, without locking", () => {
    let out = proposePaymentPlan(verified(), { instalments: 3, first_payment_date: "2026-12-01", money_trouble_mentioned: true }, ctx);
    expect(out.result.ok).toBe(true);
    expect(out.session.escalations.map((e) => e.reason)).toEqual(["financial_difficulty"]);
    out = proposePaymentPlan(out.session, { instalments: 2, first_payment_date: "2026-12-01", money_trouble_mentioned: true }, ctx);
    expect(out.session.escalations).toHaveLength(1);
    expect(out.session.negotiationLocked).toBe(false);
  });

  it("records a stop-contact request that comes with another escalation (no second SMS)", () => {
    const out = escalateWithContactPreference(verified(), { reason: "dispute", summary: "Says it isn't his." }, "stop_contact");
    expect(out.events.filter((e) => e.type === "contact_preference_recorded")).toHaveLength(1);
    expect(out.session.escalations.map((e) => e.reason)).toEqual(["dispute", "contact_preference"]);
    expect(out.events.filter((e) => e.type === "sms_sent")).toHaveLength(1);
    expect(out.session.negotiationLocked).toBe(true);
  });

  it("a written-only request before verification says nothing about a claim (N1)", () => {
    const out = recordContactPreference(newSession("ses_1", demoDebtor, demoClaim), "written_only");
    expect(String(out.result.message)).not.toMatch(/claim is still open|claim is wrong/i);
    const sms = out.events.find((e) => e.type === "sms_sent");
    expect(sms && "body" in sms ? sms.body : "").not.toContain(demoClaim.reference);
  });

  it("stop-contact escalates and locks", () => {
    const out = recordContactPreference(verified(), "stop_contact");
    expect(out.session.negotiationLocked).toBe(true);
    expect(out.events.map((e) => e.type)).toContain("escalated");
  });

  it("recording declined before verification: escalates, locks, and the SMS reveals nothing (E10, N1)", () => {
    const out = escalate(newSession("ses_1", demoDebtor, demoClaim), { reason: "recording_declined", summary: "Does not want the call recorded." });
    expect(out.session.negotiationLocked).toBe(true);
    expect(out.result.message).toMatch(/end the call/);
    const sms = out.events.find((e) => e.type === "sms_sent");
    const body = sms && "body" in sms ? sms.body : "";
    expect(body).toMatch(/without recording/);
    for (const secret of [demoClaim.reference, demoClaim.creditor, "3000", "3,000"]) expect(body).not.toContain(secret);
  });
});

describe("review fixes from call 01", () => {
  it("returns the claim together with a successful verification (one round trip fewer)", () => {
    const s = sendVerificationCode(newSession("ses_1", demoDebtor, demoClaim), ctx).session;
    const out = verifyCode(s, CODE, ctx);
    expect(out.result).toMatchObject({ ok: true, claim: { amount_owed_nok: 3000 } });
    expect(out.events.map((e) => e.type)).toContain("claim_disclosed");
  });

  it("sends payment options in writing only after verification (principle 5, N1)", () => {
    expect(sendPaymentOptions(newSession("ses_1", demoDebtor, demoClaim), ctx).result.ok).toBe(false);
    const out = sendPaymentOptions(verified(), ctx);
    expect(out.events).toContainEqual(expect.objectContaining({ type: "sms_sent", purpose: "payment_options" }));
  });

  it("does not promise follow-up contact to someone who asked for none", () => {
    const out = recordContactPreference(verified(), "stop_contact");
    const note = out.events.find((e) => e.type === "sms_sent");
    expect(note && "body" in note && note.body).not.toMatch(/will contact you/);
  });
});
