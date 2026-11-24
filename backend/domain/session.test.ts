import { describe, expect, it } from "vitest";
import { demoClaim, demoDebtor } from "./claim.js";
import {
  confirmAgreement,
  escalate,
  getClaimDetails,
  newSession,
  proposePaymentPlan,
  recordContactPreference,
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
    expect(sms && "body" in sms && sms.body).toMatch(/2026-12-05: NOK 1000[\s\S]*2027-01-05: NOK 1000[\s\S]*2027-02-05: NOK 1000/);
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

  it("stop-contact escalates and locks", () => {
    const out = recordContactPreference(verified(), "stop_contact");
    expect(out.session.negotiationLocked).toBe(true);
    expect(out.events.map((e) => e.type)).toContain("escalated");
  });
});
