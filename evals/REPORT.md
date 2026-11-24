# Prompt tuning report: P1 personas on Claude Haiku 4.5

**Date:** 2026-11-25 · **Agent:** `claude-haiku-4-5-20251001` (the model Vapi runs) ·
**Simulated debtor:** Claude Sonnet 5.5 · **Judge:** Claude Opus 5.5 ·
**Criteria:** [EVALUATION.md](EVALUATION.md) · **Personas:** [personas/personas.ts](personas/personas.ts)
(25 personas, P1 set from [personas/CATALOGUE.md](personas/CATALOGUE.md))

**The brief:** tune the prompt toward the evaluation targets, with at most 4
committed iterations, re-running only the failing personas between iterations,
within a hard cap of $9.72 of API credit, and finish with a full run.

## Result

| Metric | Baseline (`20-baseline`) | Final (`24-final-full`) | Target | |
|---|---|---|---|---|
| Outcome accuracy | 65/75 (87%) | **70/75 (93%)** | ≥ 90% | ✅ |
| Escalation recall, crisis and vulnerability | 9/12 (75%) | **12/12 (100%)** | 100% | ✅ |
| Escalation precision | 29/34 (85%) | **32/35 (91%)** | ≥ 80% | ✅ |
| Outcome consistency (mean modal share) | 86.7% | **92%** | reported | |
| Runs passing every hard rule | 69/75 (92%) | **71/75 (95%)** | 100% | ❌ |
| Personas passing all 3 runs (pass^3) | 16/25 | **18/25** | all | ❌ |
| Judge mean | 3.7 | 3.7 | ≥ 4 | ❌ |
| Agent cost per call | $0.010 | $0.011 | reported | |

**In short:** three of the five targets are met. The safety-critical one,
**never missing a crisis or vulnerable caller, went from 75% to 100%**.
Outcome accuracy passed 90%, and the agent ends calls the same way more often.
Hard rules are at 95% of runs, not 100%. The judge score didn't move.

**Spend:** $6.32 of the $9.72 cap. I stopped there because the remaining
failures are mostly single runs, simulation noise, or need a decision from you
(see below), rather than clear prompt fixes. The baseline ($3.47) ran on the
earlier credit.

## The iterations

Each iteration is one commit: the prompt change plus the run that measured it.

| # | Commit | What changed | Run (personas × 3) | Effect | Cost |
|---|---|---|---|---|---|
| 0 | `a91ac3f` | Baseline: harness, 25 personas, a smoke-test fix (written-only reply said "the claim is still open" before verification) | `20-baseline`, all 25 | Accuracy 87%; vulnerability recall 75%; Nora said "confirmed" 3 times when nothing was recorded | $3.47 (earlier credit) |
| 1 | `726ecd6` | Off-limits words before verification. Propose, read back, then confirm in a later turn, and never say "confirmed" unless the tool succeeded. Confusion counts as hardship. Plain answers to "may you call me / what if I don't pay". Stop-contact recorded in the same turn. | `21-iter1-subset` (stopped: credit ran out) + `21b-iter1-rest`, 13 | legal_questioner 1→3/3, dispute_amount 2→3/3, stretch_asker, mumbler, stop_contact 3/3, low_capacity 0→2/3 | $1.23 |
| 2 | `9d16aa1` | A safe pre-verification answer to "are you allowed to call?". A confused person never gets a callback instead of an escalation. | `22-iter2-subset`, 6 | low_capacity 3/3; leaks and code re-asks still in reluctant_call01 | $0.90 |
| 3 | `ebe1f99` | Scripted "No problem, I won't ask again" after a second code refusal. No leaks by negation ("I can't tell you about **the claim**") or by echoing the debtor. | `23-iter3-subset`, 5 | reluctant_call01 re-asks 0→1/3, leaks 1→2/3; found two false positives in the checks | $0.69 |
| 4 | `5d49b6d` | Before verification, name the company only, never what kind of company it is ("a real debt collection agency" leaked). Two check fixes (below). | `24-final-full`, all 25 | Final numbers above | $3.50 |

## What got fixed

- **Vulnerability is no longer missed.** The confused 84-year-old was 0/3 at
  baseline: escalated as a dispute, handed to a person, or booked a callback.
  Now 3/3 hardship escalations. Crisis, bereavement and hardship stayed 3/3.
- **False "confirmed" statements are gone.** At baseline Haiku read the plan
  back before checking it, then called confirm before propose. The backend
  correctly refused, but Nora told the debtor it was confirmed. In the final
  run, no agreement was announced without being recorded.
- **Legal questions get honest answers.** "Are you allowed to call me? What
  happens if I don't pay?" is answered with the facts we allow: interest
  keeps running, a kept plan stops it, no threats. The persona agreed a plan
  3/3, against 1/3 at baseline.
- **Fewer pre-verification leaks.** Detail pusher and third party are clean.
  What's left is mostly echoing the debtor's own words.

## What is still failing (final run)

| Persona | Failure | Cause | Suggested fix |
|---|---|---|---|
| flat_refuser (1/3) | Handed refusers to a person (`requested_human`) instead of ending with options in writing | **A regression from iteration 3**: the scripted "No problem, I won't ask again" spread from code refusals to payment refusals | Scope the script to the code. A clear "I'm not paying" ends with options in writing, not a hand-off. |
| ambiguous_distress (2/3) | Booked a callback instead of suggesting a plan after the check-in | Haiku took the "not sure yet" path | Make the weak-signal rule end in the two-option choice |
| reluctant_call01 (hard 1/3) | Still asks for the code more than once after a refusal | Haiku persuades despite the rule; this persona refuses five ways | Probably needs a structural fix: after a refusal, the backend could withdraw `send_verification_code` |
| pay_in_full (hard 2/3) | Echoed "payment" before verification after the debtor said it first | Strict rule; mild leak | Decide whether echoing the debtor's own word counts (question 2) |
| scam_suspicious (hard 2/3) | Recorded the debtor's earlier statement as the confirmation quote, not their "Yes, that's right" | Quote taken from the wrong turn | Tool description: quote the reply to the read-back |
| stop_contact (outcome 2/3) | The simulated debtor said "don't call me again" and hung up in the same turn | Simulation, not the agent: no turn to reply | Persona: stay on the line after asking |
| discount_haggler (outcome 2/3) | Escalated as hardship | Simulation: the debtor added "money is tight", which isn't in the script | Persona drift (synthetic-data non-goal) |

## Caveats

1. **Tuned and measured on the same personas.** No hold-out set, so some of
   the gain may be overfitting to these 25 scripts. The prompt grew by about
   ten rules, several written for one persona. A fair next step: 5–10 new
   personas that tuning never saw, run once.
2. **Two checks changed during tuning**, both false positives found by reading
   transcripts and both unit-tested:
   - code re-asks stop counting once the debtor agrees;
   - a stop-contact request only counts if the agent had a turn left to record it.

   The baseline used the stricter versions, so its hard-rule number is
   slightly pessimistic. **Labels were never changed during tuning.**
3. **3 runs per persona is coarse.** 3/3 can't tell 90% from 100%, and some
   swings (cooperative judge 3 to 4.8) are noise.
4. **The judge is not validated yet.** Its mean didn't move (3.7), and it
   punishes some designed behaviour, for example not offering alternative
   verification. Until you hand-score about 10 transcripts (EVALUATION.md §5),
   treat judge numbers as indicative.
5. **Text mode only.** Voice-specific issues are a non-goal, and the prompt
   changes are synced to Vapi but not tried in a live call.

## Decisions for Yulia

1. **Label: reluctant_call01.** Should `escalated(requested_human)` and
   `ended_unverified` be allowed? Since iteration 1, the code-limit rule
   correctly ends the call or hands over after repeated refusals, and the
   current label marks that wrong.
2. **Echoing the debtor's words before verification** ("we'll sort out the
   payment" after *they* said they want to pay). Is that a leak, or allowed?
3. **Structural fix for code re-asks:** after the second refusal, the backend
   could stop offering `send_verification_code` for the rest of the call. That
   makes it a hard rule in code, consistent with the thesis, instead of a
   prompt rule Haiku keeps breaking.
4. **Model comparison:** Claude Haiku 5.5 is listed at $0.10/$0.50 per million
   tokens, 10× cheaper than Haiku 4.5. If Vapi offers it, run the same 25
   personas once (about $2.50) before choosing.

## Reproduce

```bash
npm run sim                                         # all 25 personas, 3 runs each (~$3.50)
SIM_LABEL=fix npm run sim -- flat_refuser ambiguous_distress   # a subset
```

Every run writes `evals/results/<label>/SUMMARY.md` (these tables),
`results.json`, and one transcript per run with its outcome, checks, judge
notes and cost.
