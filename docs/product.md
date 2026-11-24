# Product: AI collection call with written follow-up

## Problem

A creditor has an overdue claim (example: NOK 3,000). Someone has to reach the
debtor, confirm it is the right person, explain the claim, agree a way to pay
and put the agreement in writing. Human collectors do this well but expensively
and inconsistently. Letters are cheap but rarely produce an agreement.

The debtor is often stressed, embarrassed or suspicious ("is this a scam?").
Many of them could pay with a small amount of flexibility. A minority are in
real hardship or dispute the debt. Getting it wrong with either group causes
harm, and in Norway it can also breach good collection practice
(*god inkassoskikk*, inkassoloven § 8; see [rulebook.md](rulebook.md)).

An AI agent can make this call at any scale. The question is how to make it
**safe by construction**: it must never disclose a debt to the wrong person,
never agree something outside policy, and never pressure someone in a
vulnerable moment.

## Users

| User | Who | Job to be done |
|---|---|---|
| **Debtor** (primary) | Person who owes the claim; reached by phone | "Help me understand what this is, trust that it's legitimate, and settle it in a way I can actually afford, without being made to feel bad." |
| **Creditor / Audun operator** | Owns the claim and the policy | "Turn overdue claims into kept payment agreements at low cost, without compliance risk or reputational damage." |
| **Human reviewer** | Collector who handles escalations | "When the agent can't or shouldn't decide, give me everything I need to act without calling the debtor back to re-ask." |

## Product principles (debtor-first)

These drive the architecture; see [architecture.md](architecture.md).

1. **Identify, then verify, then disclose.** The agent says who it is (an AI
   assistant calling on behalf of the creditor) and why it is calling, without
   mentioning the debt, until a one-time code has been verified by the
   backend. Verification is framed as protecting the debtor, not as a hurdle.
2. **Say what's possible, not just what isn't.** A rejected request (e.g. a
   discount) always comes back with a reason and the options that *are*
   available, or an offer of human review.
3. **Nothing is agreed until it's read back and confirmed.** The agent reads
   the plan in full (amounts, dates) and asks for a clear yes. The written
   follow-up repeats it.
4. **The human is always one sentence away.** Asking for a person, disputing
   the claim, or showing signs of hardship moves the case to a human. The
   reviewer receives a complete summary.
5. **Hard rules are code; soft rules are evaluated.** Verification, policy and
   confirmation are enforced by the backend, not the prompt. Tone, pacing and
   empathy are measured by evals.

## Goals (prototype)

- One debtor end-to-end: contact → OTP → claim Q&A → plan → confirmation →
  written follow-up, or → escalation ticket.
- Hard rules provably hold: shown by evals against adversarial personas.
- Every edge case in [journey.md](journey.md) is handled or listed as
  designed-but-not-built.

## Non-goals

Real phone calls, real SMS or email delivery, Norwegian-language voice,
multiple concurrent debtors, production auth, payment processing, creditor
admin UI, multi-claim debtors.

## Success metrics

| Metric | Type | Target (prototype) | How measured |
|---|---|---|---|
| Hard-rule violations (disclosure before verification, out-of-policy plan recorded, agreement without confirmation, missed mandatory escalation) | Guardrail | **0** across all eval runs | Hard checks on the event log |
| Agreement rate among verified, cooperative debtors | Outcome | High (directional) | Eval personas |
| Correct escalation (dispute, hardship, human request, out-of-policy) | Guardrail | 100% recall | Hard checks |
| Debtor experience (clarity, respect, no pressure) | Quality | Rubric mean ≥ 4/5 | LLM judge |
| Follow-up sent after every agreement | Guardrail | 100% | Event log |
| Cost per minute, latency per turn | Efficiency | Reported, not optimised | Eval run logs, see scaling.md |

In production we would add kept-promise rate (payments actually made per
agreement), complaint rate and reviewer handle time per escalation. A
collection agent that books many plans that then break is not succeeding.
