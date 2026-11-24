// Tool definitions (Zod is the single source of truth) and the dispatcher.
// The same dispatcher serves Vapi's tool webhook now and a text-mode loop later.

import { z } from "zod";
import {
  confirmAgreement,
  ESCALATION_REASONS,
  escalate,
  escalateWithContactPreference,
  getClaimDetails,
  proposePaymentPlan,
  recordContactPreference,
  sendPaymentOptions,
  sendVerificationCode,
  verifyCode,
  type Context,
  type Session,
  type ToolOutcome,
} from "../domain/session.js";

const isoDate = z.string().describe("Date in YYYY-MM-DD format");

export const toolSchemas = {
  send_verification_code: {
    description: "Send a 6-digit one-time code by SMS to the debtor's phone number on file. Call this once the person confirms they are the named debtor.",
    input: z.object({}),
  },
  verify_code: {
    description: "Check the code the person reads out. Only the backend can mark the identity as verified. On success it also returns the claim details.",
    input: z.object({ code: z.string().describe("The digits the person read out") }),
  },
  get_claim_details: {
    description: "Get the claim, today's date, the latest allowed first payment date and the payment options. Fails until the identity is verified.",
    input: z.object({}),
  },
  send_payment_options: {
    description: "Send the payment options by SMS so the person can think it over. Use when they want time or ask for it in writing. Only after verification.",
    input: z.object({}),
  },
  propose_payment_plan: {
    description: "Check a payment plan against the policy. Returns the approved schedule, or a reason and the available options.",
    input: z.object({
      instalments: z.number().int().describe("1 for full payment, or 2 or 3 monthly instalments (any number the person asks for)"),
      first_payment_date: isoDate.describe("Date of the first (or only) payment, YYYY-MM-DD"),
      total_amount_nok: z.number().optional().describe("Only if the person offers to pay a different total than the amount owed"),
      money_trouble_mentioned: z.boolean().describe("true if the person said at any point that they can't pay it all, money is tight, or they lost work or income; otherwise false"),
    }),
  },
  confirm_agreement: {
    description: "Record the agreement. Only call after reading back every payment date and amount and hearing an explicit yes.",
    input: z.object({
      instalments: z.number().int(),
      first_payment_date: isoDate,
      debtor_confirmation_quote: z.string().describe("The person's exact words of confirmation"),
    }),
  },
  escalate: {
    description: "Hand the case to a human reviewer. Use for disputes, hardship, money trouble the person can still talk about (financial_difficulty: flags for review, the call continues), crisis, confusion, requests for a person, debt advisers, out-of-policy requests the person wants reviewed, or when the person does not want the call recorded.",
    input: z.object({
      reason: z.enum(ESCALATION_REASONS),
      summary: z.string().describe("One or two sentences for the reviewer"),
      debtor_quote: z.string().optional().describe("What the person said, word for word"),
      contact_preference_requested: z
        .enum(["none", "stop_contact", "written_only"])
        .describe("Did the person also ask not to be contacted again (stop_contact) or only in writing (written_only)? Otherwise none."),
    }),
  },
  record_contact_preference: {
    description: "Record that the person wants no more contact, written contact only, or a callback at another time.",
    input: z.object({
      preference: z.enum(["stop_contact", "written_only", "callback"]),
      callback_time: z.string().optional().describe("When to call back, as the person said it"),
    }),
  },
} as const;

export type ToolName = keyof typeof toolSchemas;

export function isToolName(name: string): name is ToolName {
  return name in toolSchemas;
}

/** Drops `$schema` and Zod's safe-integer bounds, which add noise for the model and the vendor API. */
function cleanSchema(schema: unknown): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(schema, (key, value) => {
      if (key === "$schema") return undefined;
      if ((key === "minimum" || key === "maximum") && Math.abs(value) === Number.MAX_SAFE_INTEGER) return undefined;
      return value;
    }),
  );
}

/** JSON Schema for each tool, for the Vapi assistant config and the text-mode tool list. */
export function toolJsonSchemas() {
  return Object.entries(toolSchemas).map(([name, def]) => ({
    name,
    description: def.description,
    parameters: cleanSchema(z.toJSONSchema(def.input, { target: "draft-7" })),
  }));
}

export function dispatchTool(session: Session, name: string, rawArgs: unknown, ctx: Context): ToolOutcome {
  if (!isToolName(name)) {
    return { session, events: [{ type: "tool_rejected", tool: name, reason: "unknown tool" }], result: { ok: false, error: `Unknown tool ${name}` } };
  }
  let raw: unknown;
  try {
    raw = typeof rawArgs === "string" ? JSON.parse(rawArgs || "{}") : (rawArgs ?? {});
  } catch {
    raw = undefined;
  }
  const invalid = (message: string): ToolOutcome => ({
    session,
    events: [{ type: "tool_rejected", tool: name, reason: "invalid arguments" }],
    result: { ok: false, error: `Invalid arguments: ${message}` },
  });
  const parse = <T extends z.ZodType>(schema: T) => schema.safeParse(raw) as z.ZodSafeParseResult<z.infer<T>>;
  switch (name) {
    case "send_verification_code":
      return sendVerificationCode(session, ctx);
    case "get_claim_details":
      return getClaimDetails(session, ctx);
    case "send_payment_options":
      return sendPaymentOptions(session, ctx);
    case "verify_code": {
      const r = parse(toolSchemas.verify_code.input);
      return r.success ? verifyCode(session, r.data.code, ctx) : invalid(r.error.message);
    }
    case "propose_payment_plan": {
      const r = parse(toolSchemas.propose_payment_plan.input);
      return r.success ? proposePaymentPlan(session, r.data, ctx) : invalid(r.error.message);
    }
    case "confirm_agreement": {
      const r = parse(toolSchemas.confirm_agreement.input);
      return r.success ? confirmAgreement(session, r.data, ctx) : invalid(r.error.message);
    }
    case "escalate": {
      const r = parse(toolSchemas.escalate.input);
      return r.success
        ? escalateWithContactPreference(session, { reason: r.data.reason, summary: r.data.summary, debtorQuote: r.data.debtor_quote }, r.data.contact_preference_requested)
        : invalid(r.error.message);
    }
    case "record_contact_preference": {
      const r = parse(toolSchemas.record_contact_preference.input);
      return r.success ? recordContactPreference(session, r.data.preference, r.data.callback_time) : invalid(r.error.message);
    }
  }
}
