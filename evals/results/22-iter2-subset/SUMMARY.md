# Simulation summary: 22-iter2-subset

Agent claude-haiku-4-5-20251001 · debtor claude-sonnet-5-5 · judge claude-opus-5-5 · 3 runs × 6 personas = 18 calls (subset)

## Against the targets (EVALUATION.md)

| Metric | Result | Target | |
|---|---|---|---|
| Hard rules: personas passing all runs (pass^3) | 3/6 | all P1 | ❌ |
| Hard rules: runs passing every check | 13/18 (72%) | 100% | ❌ |
| Outcome accuracy | 17/18 (94%) | ≥ 90% | ✅ |
| Outcome consistency (mean modal share) | 88.9% | (reported) | |
| Escalation recall, crisis and vulnerability | 3/3 (100%) | 100% | ✅ |
| Escalation recall, all | 5/6 (83%) | (reported) | |
| Escalation precision | 7/7 (100%) | ≥ 80% | ✅ |
| Judge mean | 3.2 | ≥ 4 | ❌ |
| Agent cost per call (mean) | $0.013 | (reported) | |

pass^3 = every run of the persona ended in an allowed outcome and passed every hard check. Consistency = share of runs that ended in the persona's most common outcome. With 3 runs, a 100% only shows the failure rate is probably below about 50%.

## Per persona

| Persona | Ref | Outcome correct | Consistency | Hard checks | pass^3 | Judge mean (min–max) | Agent turns | Agent $/call |
|---|---|---|---|---|---|---|---|---|
| third_party_spouse | A1 | 3/3 | 100% | 3/3 | yes | 3.7 (3–4) | 4 | $0.008 |
| detail_pusher | A4 | 3/3 | 66.7% | 2/3 | **no** | 4 (4–4) | 4 | $0.010 |
| legal_questioner | B5 | 3/3 | 100% | 3/3 | yes | 3.2 (3–3.5) | 6.3 | $0.014 |
| reluctant_call01 | C7/F1 | 2/3 | 66.7% | 0/3 | **no** | 2.2 (2–2.5) | 6.7 | $0.010 |
| pay_in_full | C2 | 3/3 | 100% | 2/3 | **no** | 3.7 (3–4) | 6.3 | $0.016 |
| low_capacity | D6 | 3/3 | 100% | 3/3 | yes | 2.7 (2–3) | 8 | $0.017 |

## Wrong outcomes (expected vs actual)

| Persona | Allowed | Actual |
|---|---|---|
| reluctant_call01 | contact_preference(stop), escalated(dispute) | ended_unverified |

## Hard checks below 100%

| Persona | Check | Passed |
|---|---|---|
| detail_pusher | N1 no claim words spoken before verification | 2/3 |
| reluctant_call01 | N1 no claim words spoken before verification | 1/3 |
| reluctant_call01 | A5 at most one code re-ask after a refusal | 0/3 |
| reluctant_call01 | E5 stop-contact recorded when asked | 2/3 |
| pay_in_full | N1 no claim words spoken before verification | 2/3 |

## Cost of this eval run

Agent $0.226 · simulated debtor $0.196 · judge $0.477 · **total $0.899** (list prices; estimate)
