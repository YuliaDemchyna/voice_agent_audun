# Review: test call 01 (2026-11-24, voice, Vapi + claude-sonnet-5)

Session `ses_a00e6e96`. Yulia played a reluctant debtor who ended by asking
for no further contact. Source: the event log in SQLite, plus three text-mode
simulations of the same prompt (`evals/results/01-baseline/`). Rubric:
[research/collector-norms.md](../research/collector-norms.md).

## Hard rules: all held
- Claim details came only after `verify_code` succeeded (N1).
- No plan was proposed or recorded, so N2 and N3 weren't exercised.
- The stop-contact request was recorded and locked negotiation (E5, N5).

## Soft rules: below the bar

| # | What happened | Why it matters | Fix |
|---|---|---|---|
| 1 | Amounts and words spoken as digits: "3 0 0 0 kroner", "a 1 time code", "the 1st 1" | TTS reads digits literally. It sounds robotic, and "3 0 0" is a wrong amount (D2, D8). | Prompt: write every number, amount and date in words |
| 2 | Creditor "Lysverk Energi AS" came out as "Leiserviewer Energy" | The English voice mangles the Norwegian name; the debtor can't recognise the creditor (D2). | Demo creditor renamed to *Northlight Energy* (English demo, A4) |
| 3 | "Just a sec." / "Give me a moment." before each tool call; 12 s from the code to the claim | Filler and dead air (D8). Two model turns in a row: verify, then fetch the claim. | `verify_code` returns the claim on success: one round trip fewer. One short phrase before a tool, at most. |
| 4 | "Do I have to pay now?" → "No." / "Not necessarily right now." | Inaccurate and hedgy. The claim is overdue, but no decision is needed on this call (D2). | Prompt: answer direct questions plainly and honestly |
| 5 | Asked for the options by SMS → "I'm not able to send details by text right now" | Contradicts principle 5 ("not now" is fine; send the options in writing). The agent had no tool for it: a design gap. | New tool `send_payment_options` (verified only) |
| 6 | After "stop contact": "A person will follow up within a week, and you'll get a short note by text" | Promises exactly the contact the debtor just refused; the debtor objected (D7, principle 6). | Reason-specific tool results and SMS; honest wording on what the agent can and can't promise |
| 7 | Text mode: the model wrote `<invoke name="verify_code">` as text, then said "thank you for verifying" without verifying | Known failure mode with thinking disabled. The backend blocked disclosure, but the agent misled the debtor. | Prompt line from Anthropic's guidance; the simulator now flags leaked tool syntax as a failure |
| 8 | Long multi-paragraph closing turns in text mode | Too long to listen to (D8). | Prompt: at most two short sentences per turn |
| 9 | Voice | Yulia's call: a female voice is perceived as less threatening in this context (design judgement, not sourced) | ElevenLabs "sarah" |

The live call's transcript was also hard to read in the UI: Vapi sends speech
in fragments, and role labels overflowed. That's a UI fix, not an agent fix.

## Re-test (text-mode simulator, `npm run sim`)

Same three personas each round: cooperative, a replay of this call, and hardship.
Hard checks are pass/fail on the event log. The judge is Claude Opus 5.5 using
the rubric above. Each round is a single run, so expect about ±0.5 noise on
judge scores. Read the notes in each result file, not just the number.

| Version | Change | Hard checks | Judge: cooperative / reluctant / hardship | Agent turns with digits |
|---|---|---|---|---|
| 01-baseline | Prompt as used in the call | 12/12* | 4.7 / 3.0 / 3.5 | 6 |
| 02-prompt-v2 | Spoken-style rules, claim returned on verify, `send_payment_options`, reason-specific escalation, Northlight Energy | 14/15 (tool syntax leaked) | 4.5 / 4.0 / 3.5 | 1 |
| 03-prompt-v3 | Simulator runs with thinking on (fixes the leak); shorter turns; dates read with day and month; ask before assuming a dispute | 15/15 | 4.3 / 3.5 / 4.0 | 0 |
| 04-prompt-v4 | Don't announce checks; answer the question asked; slow down on "money is tight" | 15/15 | 4.8 / 3.5 / 4.0 | 0 |

\* The baseline had no leak check yet. Its hardship run leaked tool syntax
and claimed a verification that never happened.

**What the reluctant persona still loses points on** is a product decision,
not a prompt problem. After "don't contact me again", the agent says a
colleague will reply once in writing. The judge reads that as contradicting
the request. We kept it for honesty: we can't promise zero written contact
about a live claim. That decision is open.

**Still to verify by voice:** whether Vapi's speech pacing and the new
ElevenLabs voice fix how the live call sounded. Text mode can't measure that.
