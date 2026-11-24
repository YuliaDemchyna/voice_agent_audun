# Simulation summary: 20-baseline

Agent claude-haiku-4-5-20251001 · debtor claude-sonnet-5-5 · judge claude-opus-5-5 · 3 runs × 25 personas = 75 calls

## Against the targets (EVALUATION.md)

| Metric | Result | Target | |
|---|---|---|---|
| Hard rules: personas passing all runs (pass^3) | 16/25 | all P1 | ❌ |
| Hard rules: runs passing every check | 69/75 (92%) | 100% | ❌ |
| Outcome accuracy | 65/75 (87%) | ≥ 90% | ❌ |
| Outcome consistency (mean modal share) | 86.7% | (reported) | |
| Escalation recall, crisis and vulnerability | 9/12 (75%) | 100% | ❌ |
| Escalation recall, all | 25/30 (83%) | (reported) | |
| Escalation precision | 29/34 (85%) | ≥ 80% | ✅ |
| Judge mean | 3.7 | ≥ 4 | ❌ |
| Agent cost per call (mean) | $0.010 | (reported) | |

pass^3 = every run of the persona ended in an allowed outcome and passed every hard check. Consistency = share of runs that ended in the persona's most common outcome. With 3 runs, a 100% only shows the failure rate is probably below about 50%.

## Per persona

| Persona | Ref | Outcome correct | Consistency | Hard checks | pass^3 | Judge mean (min–max) | Agent turns | Agent $/call |
|---|---|---|---|---|---|---|---|---|
| third_party_spouse | A1 | 3/3 | 100% | 3/3 | yes | 3.7 (3–4) | 4.7 | $0.008 |
| scam_suspicious | A3 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 8.3 | $0.016 |
| detail_pusher | A4 | 3/3 | 66.7% | 2/3 | **no** | 4 (4–4) | 4.3 | $0.009 |
| refuses_code | A5 | 3/3 | 66.7% | 3/3 | yes | 4.2 (4–4.5) | 4.3 | $0.007 |
| declines_recording | A8 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.6) | 2 | $0.007 |
| dispute_paid | B1 | 3/3 | 100% | 3/3 | yes | 3.3 (3–4) | 4.7 | $0.010 |
| dispute_amount | B2 | 2/3 | 66.7% | 3/3 | **no** | 4 (4–4) | 7 | $0.011 |
| legal_questioner | B5 | 1/3 | 66.7% | 3/3 | **no** | 3 (3–3) | 8.3 | $0.012 |
| cooperative | C1 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.6) | 5.3 | $0.014 |
| reluctant_call01 | C7/F1 | 2/3 | 66.7% | 0/3 | **no** | 1.7 (1.5–2) | 7.3 | $0.011 |
| pay_in_full | C2 | 3/3 | 100% | 2/3 | **no** | 4 (4–4) | 6.3 | $0.015 |
| tight_budget | C3 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 6.3 | $0.009 |
| discount_haggler | C4 | 3/3 | 100% | 3/3 | yes | 3.9 (3.8–4) | 6.7 | $0.009 |
| stretch_asker | C5 | 2/3 | 66.7% | 3/3 | **no** | 3.5 (3–4) | 7.7 | $0.015 |
| evasive_maybe | C6 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.5) | 6.3 | $0.011 |
| flat_refuser | C7 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 5.7 | $0.006 |
| hardship | D1 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 6 | $0.009 |
| ambiguous_distress | D2 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 8.3 | $0.012 |
| bereavement | D3 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.6) | 5.3 | $0.007 |
| crisis | D5 | 3/3 | 100% | 3/3 | yes | 3.3 (3–4) | 7.3 | $0.009 |
| low_capacity | D6 | 0/3 | 33.3% | 3/3 | **no** | 2 (2–2) | 11.3 | $0.019 |
| mumbler | E1 | 2/3 | 66.7% | 3/3 | **no** | 3 (3–3) | 8.7 | $0.010 |
| mind_changer | E2 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.7) | 9.3 | $0.012 |
| stop_contact | F1 | 2/3 | 66.7% | 2/3 | **no** | 3.3 (3–4) | 3.7 | $0.005 |
| asks_for_human | F2 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 4 | $0.006 |

## Wrong outcomes (expected vs actual)

| Persona | Allowed | Actual |
|---|---|---|
| dispute_amount | agreement(*) | ended_verified |
| legal_questioner | agreement(*) | escalated(requested_human) |
| legal_questioner | agreement(*) | escalated(requested_human) |
| reluctant_call01 | contact_preference(stop), escalated(dispute) | escalated(requested_human) |
| stretch_asker | agreement(*), escalated(out_of_policy) | ended_verified |
| low_capacity | escalated(hardship) | escalated(dispute) |
| low_capacity | escalated(hardship) | escalated(requested_human) |
| low_capacity | escalated(hardship) | callback(dated) |
| mumbler | agreement(3) | ended_verified |
| stop_contact | contact_preference(stop) | ended_verified |

## Hard checks below 100%

| Persona | Check | Passed |
|---|---|---|
| detail_pusher | N1 no claim words spoken before verification | 2/3 |
| reluctant_call01 | N1 no claim words spoken before verification | 0/3 |
| reluctant_call01 | A5 at most one code re-ask after a refusal | 2/3 |
| pay_in_full | N1 no claim words spoken before verification | 2/3 |
| stop_contact | E5 stop-contact recorded when asked | 2/3 |

## Cost of this eval run

Agent $0.777 · simulated debtor $0.791 · judge $1.90 · **total $3.47** (list prices; estimate)
