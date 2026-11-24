import { describe, expect, it } from "vitest";
import { addMonthsClamped } from "./dates.js";
import { evaluatePlan } from "./policy.js";

const TODAY = "2026-11-24";

describe("policy engine (C4, N2)", () => {
  it("approves full payment within 14 days", () => {
    const r = evaluatePlan({ instalments: 1, firstPaymentDate: "2026-12-08" }, 3000, TODAY);
    expect(r).toMatchObject({ approved: true, plan: { payments: [{ dueDate: "2026-12-08", amountNok: 3000 }] } });
  });

  it("builds 3 equal monthly instalments on the same day each month", () => {
    const r = evaluatePlan({ instalments: 3, firstPaymentDate: "2026-12-05" }, 3000, TODAY);
    expect(r.approved && r.plan.payments).toEqual([
      { dueDate: "2026-12-05", amountNok: 1000 },
      { dueDate: "2027-01-05", amountNok: 1000 },
      { dueDate: "2027-02-05", amountNok: 1000 },
    ]);
  });

  it("puts rounding on the last instalment", () => {
    const r = evaluatePlan({ instalments: 3, firstPaymentDate: TODAY }, 1000, TODAY);
    expect(r.approved && r.plan.payments.map((p) => p.amountNok)).toEqual([333, 333, 334]);
  });

  it.each([
    [{ instalments: 3, firstPaymentDate: "2026-12-01", totalAmountNok: 2500 }, "discount_not_allowed"],
    [{ instalments: 6, firstPaymentDate: "2026-12-01" }, "too_many_instalments"],
    [{ instalments: 0, firstPaymentDate: "2026-12-01" }, "invalid_instalments"],
    [{ instalments: 1, firstPaymentDate: "2026-12-09" }, "first_payment_too_late"], // day 15
    [{ instalments: 1, firstPaymentDate: "2027-01-23" }, "first_payment_too_late"], // full payment deferred: A11
    [{ instalments: 2, firstPaymentDate: "2026-11-23" }, "first_payment_in_past"],
    [{ instalments: 2, firstPaymentDate: "next friday" }, "invalid_date"],
  ])("rejects %o as %s, with options to offer instead (C8)", (proposal, code) => {
    const r = evaluatePlan(proposal, 3000, TODAY);
    expect(r.approved).toBe(false);
    if (!r.approved) {
      expect(r.code).toBe(code);
      expect(r.reason.length).toBeGreaterThan(0);
      expect(r.alternatives.length).toBeGreaterThan(0);
    }
  });

  it("accepts day 14 exactly", () => {
    expect(evaluatePlan({ instalments: 2, firstPaymentDate: "2026-12-08" }, 3000, TODAY).approved).toBe(true);
  });

  it("clamps month ends", () => {
    expect(addMonthsClamped("2027-01-31", 1)).toBe("2027-02-28");
  });
});
