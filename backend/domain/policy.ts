// Payment policy engine (rulebook C4, N2, C8). Pure and deterministic.
//
// Policy: full payment, or 2-3 equal monthly instalments. The first (or only)
// payment is due within 14 calendar days of the agreement date. Later
// instalments fall on the same day of each following month. No discounts.
// Interest and fees are frozen while the plan is kept (A12).

import { addDays, addMonthsClamped, daysBetween, isIsoDate, type IsoDate } from "./dates.js";

export const MAX_DAYS_TO_FIRST_PAYMENT = 14;
export const ALLOWED_INSTALMENTS = [1, 2, 3] as const;

export interface PlanProposal {
  instalments: number;
  firstPaymentDate: IsoDate;
  /** What the debtor offered to pay in total; anything below the claim is a discount. */
  totalAmountNok?: number;
}

export interface Payment {
  dueDate: IsoDate;
  amountNok: number;
}

export interface ApprovedPlan {
  instalments: number;
  totalAmountNok: number;
  payments: Payment[];
}

export type RejectionCode =
  | "discount_not_allowed"
  | "too_many_instalments"
  | "invalid_instalments"
  | "first_payment_too_late"
  | "first_payment_in_past"
  | "invalid_date";

export type PolicyResult =
  | { approved: true; plan: ApprovedPlan }
  | { approved: false; code: RejectionCode; reason: string; alternatives: string[] };

export function buildSchedule(totalNok: number, instalments: number, firstPaymentDate: IsoDate): Payment[] {
  const base = Math.floor(totalNok / instalments);
  const remainder = totalNok - base * instalments;
  return Array.from({ length: instalments }, (_, i) => ({
    dueDate: addMonthsClamped(firstPaymentDate, i),
    amountNok: i === instalments - 1 ? base + remainder : base,
  }));
}

export function availableOptions(claimAmountNok: number, agreementDate: IsoDate): string[] {
  const latest = addDays(agreementDate, MAX_DAYS_TO_FIRST_PAYMENT);
  return [
    `Pay NOK ${claimAmountNok} in full, on any date up to ${latest}.`,
    `Pay in 2 monthly instalments of NOK ${claimAmountNok / 2}, the first on any date up to ${latest}.`,
    `Pay in 3 monthly instalments of NOK ${claimAmountNok / 3}, the first on any date up to ${latest}.`,
    "Ask for a person to review a different arrangement.",
  ];
}

export function evaluatePlan(proposal: PlanProposal, claimAmountNok: number, agreementDate: IsoDate): PolicyResult {
  const alternatives = availableOptions(claimAmountNok, agreementDate);
  const reject = (code: RejectionCode, reason: string): PolicyResult => ({ approved: false, code, reason, alternatives });

  if (proposal.totalAmountNok !== undefined && proposal.totalAmountNok < claimAmountNok) {
    return reject("discount_not_allowed", `Discounts aren't available: the amount owed is NOK ${claimAmountNok}.`);
  }
  if (!Number.isInteger(proposal.instalments) || proposal.instalments < 1) {
    return reject("invalid_instalments", "The number of payments must be 1, 2 or 3.");
  }
  if (proposal.instalments > 3) {
    return reject("too_many_instalments", "Plans can have at most 3 monthly instalments.");
  }
  if (!isIsoDate(proposal.firstPaymentDate)) {
    return reject("invalid_date", "The first payment date wasn't a valid date (expected YYYY-MM-DD).");
  }
  const days = daysBetween(agreementDate, proposal.firstPaymentDate);
  if (days < 0) {
    return reject("first_payment_in_past", "The first payment date can't be in the past.");
  }
  if (days > MAX_DAYS_TO_FIRST_PAYMENT) {
    return reject(
      "first_payment_too_late",
      `The first payment has to be within ${MAX_DAYS_TO_FIRST_PAYMENT} days, by ${addDays(agreementDate, MAX_DAYS_TO_FIRST_PAYMENT)}.`,
    );
  }
  return {
    approved: true,
    plan: {
      instalments: proposal.instalments,
      totalAmountNok: claimAmountNok,
      payments: buildSchedule(claimAmountNok, proposal.instalments, proposal.firstPaymentDate),
    },
  };
}
