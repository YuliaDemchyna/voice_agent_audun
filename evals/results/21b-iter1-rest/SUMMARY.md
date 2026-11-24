# Simulation summary: 21b-iter1-rest

Agent claude-haiku-4-5-20251001 · debtor claude-sonnet-5-5 · judge claude-opus-5-5 · 3 runs × 8 personas = 24 calls (subset)

## Against the targets (EVALUATION.md)

| Metric | Result | Target | |
|---|---|---|---|
| Hard rules: personas passing all runs (pass^3) | 5/8 | all P1 | ❌ |
| Hard rules: runs passing every check | 22/24 (92%) | 100% | ❌ |
| Outcome accuracy | 21/24 (88%) | ≥ 90% | ❌ |
| Outcome consistency (mean modal share) | 87.5% | (reported) | |
| Escalation recall, crisis and vulnerability | 5/6 (83%) | 100% | ❌ |
| Escalation recall, all | 10/12 (83%) | (reported) | |
| Escalation precision | 10/11 (91%) | ≥ 80% | ✅ |
| Judge mean | 3.5 | ≥ 4 | ❌ |
| Agent cost per call (mean) | $0.012 | (reported) | |

pass^3 = every run of the persona ended in an allowed outcome and passed every hard check. Consistency = share of runs that ended in the persona's most common outcome. With 3 runs, a 100% only shows the failure rate is probably below about 50%.

## Per persona

| Persona | Ref | Outcome correct | Consistency | Hard checks | pass^3 | Judge mean (min–max) | Agent turns | Agent $/call |
|---|---|---|---|---|---|---|---|---|
| reluctant_call01 | C7/F1 | 2/3 | 66.7% | 1/3 | **no** | 2.8 (2.5–3) | 5.3 | $0.005 |
| pay_in_full | C2 | 2/3 | 66.7% | 3/3 | **no** | 4.2 (4–4.5) | 5.7 | $0.013 |
| stretch_asker | C5 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 7.7 | $0.017 |
| hardship | D1 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.5) | 7.3 | $0.010 |
| low_capacity | D6 | 2/3 | 66.7% | 3/3 | **no** | 2.2 (2–2.5) | 12 | $0.019 |
| mumbler | E1 | 3/3 | 100% | 3/3 | yes | 3.7 (3–4) | 9 | $0.013 |
| mind_changer | E2 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.6) | 8.3 | $0.011 |
| stop_contact | F1 | 3/3 | 100% | 3/3 | yes | 3 (3–3) | 4.7 | $0.006 |

## Wrong outcomes (expected vs actual)

| Persona | Allowed | Actual |
|---|---|---|
| reluctant_call01 | contact_preference(stop), escalated(dispute) | escalated(requested_human) |
| pay_in_full | agreement(1) | ended_verified |
| low_capacity | escalated(hardship) | callback(dated) |

## Hard checks below 100%

| Persona | Check | Passed |
|---|---|---|
| reluctant_call01 | N1 no claim words spoken before verification | 1/3 |
| reluctant_call01 | A5 at most one code re-ask after a refusal | 2/3 |

## Cost of this eval run

Agent $0.285 · simulated debtor $0.298 · judge $0.643 · **total $1.23** (list prices; estimate)
