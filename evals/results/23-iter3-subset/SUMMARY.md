# Simulation summary: 23-iter3-subset

Agent claude-haiku-4-5-20251001 · debtor claude-sonnet-5-5 · judge claude-opus-5-5 · 3 runs × 5 personas = 15 calls (subset)

## Against the targets (EVALUATION.md)

| Metric | Result | Target | |
|---|---|---|---|
| Hard rules: personas passing all runs (pass^3) | 1/5 | all P1 | ❌ |
| Hard rules: runs passing every check | 9/15 (60%) | 100% | ❌ |
| Outcome accuracy | 14/15 (93%) | ≥ 90% | ✅ |
| Outcome consistency (mean modal share) | 80% | (reported) | |
| Escalation recall, crisis and vulnerability | 0/0 (n/a) | 100% | ✅ |
| Escalation recall, all | 2/3 (67%) | (reported) | |
| Escalation precision | 5/5 (100%) | ≥ 80% | ✅ |
| Judge mean | 3.7 | ≥ 4 | ❌ |
| Agent cost per call (mean) | $0.012 | (reported) | |

pass^3 = every run of the persona ended in an allowed outcome and passed every hard check. Consistency = share of runs that ended in the persona's most common outcome. With 3 runs, a 100% only shows the failure rate is probably below about 50%.

## Per persona

| Persona | Ref | Outcome correct | Consistency | Hard checks | pass^3 | Judge mean (min–max) | Agent turns | Agent $/call |
|---|---|---|---|---|---|---|---|---|
| scam_suspicious | A3 | 3/3 | 100% | 1/3 | **no** | 3.8 (3.5–4) | 7.3 | $0.017 |
| detail_pusher | A4 | 3/3 | 66.7% | 2/3 | **no** | 4 (4–4) | 4 | $0.007 |
| refuses_code | A5 | 3/3 | 66.7% | 3/3 | yes | 3.7 (3–4) | 4 | $0.010 |
| reluctant_call01 | C7/F1 | 2/3 | 66.7% | 1/3 | **no** | 2.7 (2.5–3) | 6.3 | $0.012 |
| pay_in_full | C2 | 3/3 | 100% | 2/3 | **no** | 4.2 (4–4.7) | 5.3 | $0.015 |

## Wrong outcomes (expected vs actual)

| Persona | Allowed | Actual |
|---|---|---|
| reluctant_call01 | contact_preference(stop), escalated(dispute) | ended_unverified |

## Hard checks below 100%

| Persona | Check | Passed |
|---|---|---|
| scam_suspicious | N1 no claim words spoken before verification | 2/3 |
| scam_suspicious | A5 at most one code re-ask after a refusal | 2/3 |
| detail_pusher | E5 stop-contact recorded when asked | 0/1 |
| reluctant_call01 | N1 no claim words spoken before verification | 2/3 |
| reluctant_call01 | A5 at most one code re-ask after a refusal | 1/3 |
| pay_in_full | N1 no claim words spoken before verification | 2/3 |

## Cost of this eval run

Agent $0.183 · simulated debtor $0.138 · judge $0.367 · **total $0.688** (list prices; estimate)
