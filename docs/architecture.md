# Architecture

> Full write-up comes in Phase 4. Until then this file holds the **decision
> log**: every stack or architecture decision, with date, options considered,
> the choice and the reason. The newest entry goes last. Git history keeps the
> versions.

## Principles (from the product thesis)

1. **Hard rules are code.** The LLM proposes through tools. A deterministic
   domain layer approves or rejects and returns a speakable reason. Claim data
   is not in the model's context until the backend has verified the OTP.
2. **Soft rules are evaluated.** A rubric derived from synthetic calls is
   scored by an LLM judge. Hard checks run on the event log and never depend
   on the judge.
3. **Testable without talking to it.** The conversation loop runs in text
   mode. Voice is a transport adapter. Evals run against text mode.
4. **One conversation loop.** Voice and text must run the *same* loop
   (prompt, tools, dispatch). If the voice platform ran its own LLM loop,
   evals would test something different from what the debtor talks to.

## Decision log

| ID | Date | Decision | Status |
|---|---|---|---|
| D0 | 2026-11-24 | Repo layout: `domain` / `conversation` / `transport` split inside `backend/` (see README) | Accepted |
| D1 | 2026-11-24 | Voice platform | Pending |
| D2 | 2026-11-24 | LLM(s) for agent, debtor simulator, judge | Pending |
| D3 | 2026-11-24 | Backend language and framework | Pending |
| D4 | 2026-11-24 | Storage (session state, event log) | Pending |
| D5 | 2026-11-24 | Eval tooling | Pending |

### D0: Repo layout

- **Decision:** keep the proposed top-level folders (`docs`, `agent`,
  `backend`, `web`, `evals`). Split `backend/` into `domain` (pure rules),
  `conversation` (text-mode loop), `transport` (voice adapter), `services`
  and `api`.
- **Why:** this layout encodes principles 1 and 3. `domain` has no LLM and no
  I/O, so the policy engine can be unit-tested exhaustively. Evals import
  `conversation` directly and never go through voice.
- **Deviation from the first draft:** tool *schemas* live next to the domain
  code that enforces them and are generated from typed models. They do not
  live in `agent/`. That way a schema cannot drift from its validator.
  `agent/` holds the prompt and the voice-platform config.
