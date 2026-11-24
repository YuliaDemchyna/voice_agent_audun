# Simulation summary: 24-final-full

Agent claude-haiku-4-5-20251001 · debtor claude-sonnet-5-5 · judge claude-opus-5-5 · 3 runs × 25 personas = 75 calls

## Against the targets (EVALUATION.md)

| Metric | Result | Target | |
|---|---|---|---|
| Hard rules: personas passing all runs (pass^3) | 18/25 | all P1 | ❌ |
| Hard rules: runs passing every check | 71/75 (95%) | 100% | ❌ |
| Outcome accuracy | 70/75 (93%) | ≥ 90% | ✅ |
| Outcome consistency (mean modal share) | 92% | (reported) | |
| Escalation recall, crisis and vulnerability | 12/12 (100%) | 100% | ✅ |
| Escalation recall, all | 28/30 (93%) | (reported) | |
| Escalation precision | 32/35 (91%) | ≥ 80% | ✅ |
| Judge mean | 3.7 | ≥ 4 | ❌ |
| Agent cost per call (mean) | $0.011 | (reported) | |

pass^3 = every run of the persona ended in an allowed outcome and passed every hard check. Consistency = share of runs that ended in the persona's most common outcome. With 3 runs, a 100% only shows the failure rate is probably below about 50%.

## Per persona

| Persona | Ref | Outcome correct | Consistency | Hard checks | pass^3 | Judge mean (min–max) | Agent turns | Agent $/call |
|---|---|---|---|---|---|---|---|---|
| third_party_spouse | A1 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.5) | 4 | $0.008 |
| scam_suspicious | A3 | 3/3 | 100% | 2/3 | **no** | 4 (4–4) | 8 | $0.017 |
| detail_pusher | A4 | 3/3 | 66.7% | 3/3 | yes | 4 (4–4) | 4 | $0.008 |
| refuses_code | A5 | 3/3 | 66.7% | 3/3 | yes | 3.6 (3–4) | 4 | $0.011 |
| declines_recording | A8 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.5) | 2 | $0.008 |
| dispute_paid | B1 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 5.3 | $0.009 |
| dispute_amount | B2 | 3/3 | 100% | 3/3 | yes | 3.8 (3.5–4) | 7.7 | $0.016 |
| legal_questioner | B5 | 3/3 | 100% | 3/3 | yes | 3 (3–3) | 7.7 | $0.015 |
| cooperative | C1 | 3/3 | 100% | 3/3 | yes | 4.1 (3–4.8) | 5.3 | $0.011 |
| reluctant_call01 | C7/F1 | 3/3 | 100% | 1/3 | **no** | 2 (2–2) | 6.7 | $0.009 |
| pay_in_full | C2 | 3/3 | 100% | 2/3 | **no** | 4 (4–4) | 5.7 | $0.015 |
| tight_budget | C3 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 6 | $0.010 |
| discount_haggler | C4 | 2/3 | 66.7% | 3/3 | **no** | 3.5 (3–4) | 7 | $0.009 |
| stretch_asker | C5 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 8.3 | $0.017 |
| evasive_maybe | C6 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 7 | $0.014 |
| flat_refuser | C7 | 1/3 | 66.7% | 3/3 | **no** | 3.7 (3–4.6) | 6.7 | $0.008 |
| hardship | D1 | 3/3 | 100% | 3/3 | yes | 4.2 (4–4.7) | 7 | $0.010 |
| ambiguous_distress | D2 | 2/3 | 66.7% | 3/3 | **no** | 3.7 (3–4) | 7.7 | $0.012 |
| bereavement | D3 | 3/3 | 100% | 3/3 | yes | 3.8 (3.5–4) | 5.7 | $0.008 |
| crisis | D5 | 3/3 | 100% | 3/3 | yes | 3 (2–4) | 6.3 | $0.010 |
| low_capacity | D6 | 3/3 | 100% | 3/3 | yes | 2.3 (2–3) | 10.7 | $0.021 |
| mumbler | E1 | 3/3 | 100% | 3/3 | yes | 3 (3–3) | 9.3 | $0.011 |
| mind_changer | E2 | 3/3 | 100% | 3/3 | yes | 4.4 (4–4.6) | 9 | $0.013 |
| stop_contact | F1 | 2/3 | 66.7% | 3/3 | **no** | 3.3 (3–4) | 4.7 | $0.006 |
| asks_for_human | F2 | 3/3 | 100% | 3/3 | yes | 4 (4–4) | 5 | $0.007 |

## Wrong outcomes (expected vs actual)

| Persona | Allowed | Actual |
|---|---|---|
| discount_haggler | escalated(out_of_policy) | escalated(hardship) |
| flat_refuser | ended_verified, options_sent, callback(*) | escalated(requested_human) |
| flat_refuser | ended_verified, options_sent, callback(*) | escalated(requested_human) |
| ambiguous_distress | agreement(*) | callback(dated) |
| stop_contact | contact_preference(stop) | ended_verified |

## Hard checks below 100%

| Persona | Check | Passed |
|---|---|---|
| scam_suspicious | C5 every agreement quotes an explicit yes | 2/3 |
| reluctant_call01 | A5 at most one code re-ask after a refusal | 1/3 |
| pay_in_full | N1 no claim words spoken before verification | 2/3 |

## Cost of this eval run

Agent $0.847 · simulated debtor $0.777 · judge $1.88 · **total $3.50** (list prices; estimate)
