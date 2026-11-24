# Product: AI collection call with written follow-up

The context is assumed by me from 1. conversation wih Peter, 2.  short collab with Corafone, 3. research and experience within voice industry.

## Context: the industry

- Human agents do collection calls today. It is expensive, and quality varies
from agent to agent.
- Staff turnover is high, so hiring and training never stop.
- Most calls are repetitive: verify, explain, agree a standard plan. AI takes
those, and scarce human time goes to the edge cases: disputes, hardship,
requests outside policy.
- That raises the quality bar for the human role: fewer cases, but harder
ones that matter more.

## Context: the debtor

- Often stressed, embarrassed or suspicious ("is this a scam?").
- Most can pay with some flexibility. A minority are in hardship or dispute
the claim.
- Mishandling either group harms them and breaches good collection practice
(*god inkassoskikk*; see [rulebook.md](rulebook.md)).

## Problem

A creditor has an overdue claim (NOK 3,000). Someone has to reach the debtor
at a permitted time, confirm their identity, explain the claim, agree a
payment plan within the creditor's policy, and confirm it in writing.

## Users

| User | Who | Job to be done |
|---|---|---|
| **Debtor** (primary) | Person who owes the claim; reached by phone | "Help me understand what this is, trust that it's legitimate, and settle it in a way I can actually afford, without being made to feel bad." |
| **Creditor / Audun operator** | Owns the claim and the policy | "Turn overdue claims into kept payment agreements at low cost, without compliance risk or reputational damage." |
| **Human reviewer** | Collector who handles escalations | "When the agent can't or shouldn't decide, give me everything I need to act without calling the debtor back to re-ask." |

## Product principles

What wins when two good things conflict. **When two principles conflict, the higher one wins.**
Each principle links to its evidence in the [appendix](#appendix-evidence-for-the-principles), tagged Law, Guidance, Research, or Belief (a hypothesis plus the metric that tests it).

1. **Privacy over reach.** If we can't verify who we're talking to, we disclose nothing and try again later, even if the claim goes unresolved today. [Evidence](#1-privacy-over-reach)
2. **Guarantees over flexibility.** Anything that must never happen is blocked in code, not just asked for in the prompt. Out-of-policy requests go to a human, not to the model's judgement. [Evidence](#2-guarantees-over-flexibility)
3. **When in doubt, escalate.** A human over automation rate. A needless escalation costs a reviewer a few minutes; a missed one harms the debtor and breaches the law. [Evidence](#3-when-in-doubt-escalate)
4. **Debtor experience over short-term conversion.** No pressure, even when it would close more plans on this call. [Evidence](#4-debtor-experience-over-short-term-conversion)
5. **Collaboration over closing.** Understand the debtor's situation before proposing terms, and offer the options neutrally. "Not now" is acceptable: we send the options in writing and call back at their chosen time. [Evidence](#5-collaboration-over-closing)
6. **Honest about limits over seamless.** The agent says it is an AI and what it can and can't agree to. Every "no" comes with a reason and the options that *are* available. "I don't know" beats a plausible guess. [Evidence](#6-honest-about-limits-over-seamless)
7. **Written over spoken for anything binding.** Agreements, dispute outcomes and payment details go in writing. Payment details are never asked for on the call. [Evidence](#7-written-over-spoken-for-anything-binding)

Concrete rules: [rulebook.md](rulebook.md). Enforcement: [architecture.md](architecture.md).

## Goals (prototype)

- One debtor end-to-end: contact → OTP → claim Q&A → plan → confirmation →
written follow-up, or → escalation ticket.
- Hard rules provably hold: shown by evals against adversarial personas.
- Every edge case in [journey.md](journey.md) is handled or listed as
designed-but-not-built.

## Non-goals

Real phone calls, real SMS or email delivery, Norwegian-language voice,
multiple concurrent debtors, production auth, payment processing, creditor
admin UI, multi-claim debtors, and a contact scheduler. The scheduler is
where rulebook N9 (legal call hours and attempt limits) would be enforced; it
is designed but not built, and in the demo calls are started manually.

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

## Appendix: evidence for the principles

### 1. Privacy over reach

**Law:** duty of confidentiality (inkassoloven 1988 § 28 / new act § 37); GDPR Art. 5(1)(f). **Guidance:** Finanstilsynet circular 5/2022 §§ 2, 5 names calling the wrong person as a risk to control.

### 2. Guarantees over flexibility

**Brief:** "the model cannot override verification". **Eval:** the prompt-injection and verification-bypass eval personas (Phase 2) must fail against the backend, not merely against the prompt.

### 3. When in doubt, escalate

**Law:** collection must be adjusted for debtors in serious difficulty (new act § 14(4)); collection stops on a dispute (§ 24(2)); GDPR Art. 22(3) gives a right to human review. **Guidance:** FCA FG21/1 and CONC 7.10 on vulnerability and capacity.

### 4. Debtor experience over short-term conversion

**Law:** pressure breaches good collection practice (*god inkassoskikk*, 1988 act § 8), and then the debtor owes no collection costs (§ 17(4)), so pressure costs money directly. **Research:** one field study found AI collection calls underperformed human calls, with lasting effects (working paper, unreviewed). Clearer, more respectful letters raised repayment (BIT, HMRC trials). **Belief:** respectful treatment leads to more kept plans. No study isolates this for live calls, so we measure it: kept-promise rate and complaint rate.

### 5. Collaboration over closing

**Guidance:** listen first and fit the plan to circumstances (FCA CONC 7.3.4; Money Advice Trust IDEA). Respect opt-outs and contact preferences (circular 5/2022 § 5). **Research:** debtors prompted to contact their creditor themselves repaid more ("Call first, pay later", *Behavioural Public Policy*). **Law:** an agreed plan binds the creditor (1988 act § 13 / new act § 27), so a plan the debtor can't keep is costly.

### 6. Honest about limits over seamless

**Law:** communication must be correct and understandable (new act § 15). **Guidance:** EU AI Act Art. 50 requires disclosing an AI at first contact (in force in the EU, not yet in Norway); FCA CONC 7.9.1, 7.11.

### 7. Written over spoken for anything binding

**Law:** written confirmation of each instalment date and amount (new act § 16(4)); a written, reasoned answer to disputes (§ 25). **Brief:** "send a written follow-up".
