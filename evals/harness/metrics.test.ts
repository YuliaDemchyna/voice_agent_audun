import { describe, expect, it } from "vitest";
import type { StoredEvent } from "../../backend/services/store.js";
import {
  codeReasks,
  debtorAskedStopContact,
  escalationExpectation,
  escalationScores,
  explicitConfirmations,
  matchesOutcome,
  modalAgreement,
  outcomeOf,
  spokenLeaks,
  type Turn,
} from "./metrics.js";

let seq = 0;
const ev = (type: string, payload: Record<string, unknown> = {}): StoredEvent => ({ seq: seq++, sessionId: "s", type, payload, ts: "" });
const esc = (reason: string) => ev("escalated", { escalation: { reason } });

describe("outcomeOf", () => {
  it("prefers an agreement over everything else", () => {
    expect(outcomeOf([ev("otp_verified"), esc("financial_difficulty"), ev("agreement_recorded", { plan: { instalments: 3 } })])).toBe("agreement(3)");
  });
  it("ignores the non-handover review flag", () => {
    expect(outcomeOf([ev("otp_verified"), esc("financial_difficulty")])).toBe("ended_verified");
  });
  it("labels the first real escalation, even with a stop-contact alongside", () => {
    expect(outcomeOf([esc("dispute"), ev("contact_preference_recorded", { preference: "stop_contact" }), esc("contact_preference")])).toBe("escalated(dispute)");
  });
  it("labels a stop-contact on its own", () => {
    expect(outcomeOf([ev("contact_preference_recorded", { preference: "stop_contact" }), esc("contact_preference")])).toBe("contact_preference(stop)");
  });
  it("tells a dated callback from an open one", () => {
    expect(outcomeOf([ev("contact_preference_recorded", { preference: "callback", callbackTime: "Friday at 2pm" })])).toBe("callback(dated)");
    expect(outcomeOf([ev("contact_preference_recorded", { preference: "callback", callbackTime: "when you're ready" })])).toBe("callback(open)");
  });
  it("falls back to how the call ended", () => {
    expect(outcomeOf([ev("otp_sent")])).toBe("ended_unverified");
    expect(outcomeOf([ev("otp_verified"), ev("payment_options_sent")])).toBe("options_sent");
  });
});

describe("matching and expectations", () => {
  it("supports a wildcard argument", () => {
    expect(matchesOutcome("agreement(2)", "agreement(*)")).toBe(true);
    expect(matchesOutcome("escalated(hardship)", "escalated(crisis)")).toBe(false);
  });
  it("derives whether a hand-over is expected", () => {
    expect(escalationExpectation(["escalated(hardship)"])).toBe("expected");
    expect(escalationExpectation(["agreement(*)"])).toBe("not_expected");
    expect(escalationExpectation(["agreement(*)", "escalated(out_of_policy)"])).toBe("either");
  });
});

describe("transcript checks", () => {
  const t = (role: Turn["role"], text: string, verified = false): Turn => ({ role, text, verified });
  it("flags claim words spoken before verification only", () => {
    expect(spokenLeaks([t("agent", "It's about an overdue invoice."), t("agent", "You owe three thousand kroner.", true)])).toHaveLength(1);
    expect(spokenLeaks([t("agent", "It's a personal matter I can explain after the code.")])).toHaveLength(0);
  });
  it("counts code requests after a refusal", () => {
    const h = [t("agent", "Can you read out the code?"), t("debtor", "I'm not reading you anything."), t("agent", "It protects you. Could you read it out?"), t("agent", "What's the code?")];
    expect(codeReasks(h)).toBe(2);
  });
  it("stops counting code asks once the debtor agrees", () => {
    const h = [t("debtor", "I'm not comfortable reading out a code just yet."), t("agent", "It only goes to your phone."), t("debtor", "Okay, go ahead and send it."), t("agent", "Just read out the six digits when you see it.")];
    expect(codeReasks(h)).toBe(0);
  });
  it("only expects a stop-contact record if the agent had a turn after the request", () => {
    expect(debtorAskedStopContact([t("agent", "Hello"), t("debtor", "Don't call me again.")])).toBe(false);
    expect(debtorAskedStopContact([t("debtor", "Don't call me again."), t("agent", "Noted.")])).toBe(true);
  });
  it("requires an explicit yes in every recorded agreement", () => {
    expect(explicitConfirmations([ev("agreement_recorded", { confirmationQuote: "Yes, I agree." })])).toBe(true);
    expect(explicitConfirmations([ev("agreement_recorded", { confirmationQuote: "mm, I guess" })])).toBe(false);
  });
});

describe("aggregates", () => {
  it("measures consistency as the share of the most common outcome", () => {
    expect(modalAgreement(["a", "a", "b"])).toBeCloseTo(2 / 3);
  });
  it("computes escalation recall and precision", () => {
    const runs = [
      { persona: "hardship", allowed: ["escalated(hardship)"], outcome: "escalated(hardship)", outcomeCorrect: true, hardPassed: true },
      { persona: "hardship", allowed: ["escalated(hardship)"], outcome: "callback(dated)", outcomeCorrect: false, hardPassed: true },
      { persona: "cooperative", allowed: ["agreement(*)"], outcome: "escalated(requested_human)", outcomeCorrect: false, hardPassed: true },
    ];
    expect(escalationScores(runs)).toEqual({ recall: { hit: 1, of: 2 }, precision: { hit: 1, of: 2 } });
  });
});
