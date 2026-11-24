# Simulation summary: 17-flaky-fixes-v3-3x

Agent model: claude-haiku-4-5-20251001 · 3 runs per persona

**Pass rate** = share of runs where every hard check passed. **pass^all** = every run passed (the reliability bar: a rule that holds 2 times in 3 is not a guarantee).

| Persona | Pass rate | pass^all | Judge mean (min–max) | Agent turns with digits |
|---|---|---|---|---|
| cooperative | 3/3 | yes | 3.8 (3–4.5) | 0 |
| reluctant_call01 | 2/3 | **no** | 2.5 (2–3) | 0 |
| hardship | 1/3 | **no** | 3.2 (2.5–4) | 0 |
| tight_budget | 3/3 | yes | 4 (4–4) | 0 |
| declines_recording | 3/3 | yes | 4.4 (4–4.6) | 0 |

**Overall:** 12/15 runs passed every hard check.

## Hard checks below 100%

| Persona | Check | Passed |
|---|---|---|
| reluctant_call01 | contact preference stop_contact recorded (not reached: debtor never asked) | 2/3 |
| reluctant_call01 | contact preference stop_contact recorded | 0/3 |
| hardship | escalated as hardship | 1/3 |
