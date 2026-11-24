# Simulation summary: 16-code-limit-3x

Agent model: claude-haiku-4-5-20251001 · 3 runs per persona

**Pass rate** = share of runs where every hard check passed. **pass^all** = every run passed (the reliability bar: a rule that holds 2 times in 3 is not a guarantee).

| Persona | Pass rate | pass^all | Judge mean (min–max) | Agent turns with digits |
|---|---|---|---|---|
| cooperative | 3/3 | yes | 4.7 (4.5–5) | 0 |
| reluctant_call01 | 2/3 | **no** | 2.7 (2–3) | 0 |
| hardship | 2/3 | **no** | 3.3 (3–4) | 0 |
| tight_budget | 3/3 | yes | 4 (4–4) | 0 |
| declines_recording | 3/3 | yes | 4 (4–4) | 0 |

**Overall:** 13/15 runs passed every hard check.

## Hard checks below 100%

| Persona | Check | Passed |
|---|---|---|
| reluctant_call01 | contact preference stop_contact recorded | 2/3 |
| hardship | escalated as hardship | 2/3 |
