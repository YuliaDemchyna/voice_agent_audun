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
4. **One source of truth for prompt and tools.** Ideally voice and text
   would run the *same* loop. For the prototype we accept two loops: Vapi
   runs the LLM during voice calls, and our text-mode loop runs it in evals.
   Both are built from the same prompt file and the same tool definitions,
   and both call the same backend tool handlers (see D1).

## Decision log

| ID | Date | Decision | Status |
|---|---|---|---|
| D0 | 2026-11-24 | Repo layout: `domain` / `conversation` / `transport` split inside `backend/` (see README) | Accepted |
| D1 | 2026-11-24 | Voice platform: **Vapi**, default mode (Vapi runs the LLM, our tools via server webhook) | Accepted |
| D2 | 2026-11-24 | LLMs: agent **Claude Sonnet 5.5**, debtor simulator **Sonnet 5.5**, judge **Opus 5.5**; Haiku 5.5 as an eval comparison | Accepted |
| D3 | 2026-11-24 | Backend: **TypeScript + Hono**, one language across backend, web and evals | Accepted |
| D4 | 2026-11-24 | Storage: **`node:sqlite`**, append-only `events` table | Accepted |
| D5 | 2026-11-24 | Evals: **thin custom harness on Vitest** | Accepted |

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

### D1: Voice platform, Vapi (default mode)

- **Options considered:** Vapi in default mode; Vapi in custom-LLM mode;
  Pipecat; LiveKit Agents; ElevenLabs Agents; OpenAI Realtime. The Phase 0
  comparison table is in the session export.
- **Decision:** Vapi in default mode. Vapi runs STT, the LLM turn loop and TTS.
  Our tools are server tools that Vapi calls on our Hono backend over a
  webhook. The assistant config (prompt, tool list, model, voice) is defined
  in code under `agent/` and pushed or passed inline, not edited by hand in
  the dashboard.
- **Why:** prototype speed matters most in a 4–5 hour budget, and Yulia
  already knows the platform.
- **Tradeoff accepted:** during a call the conversation loop is Vapi's, not
  ours. Text-mode evals therefore drive the *same prompt and tools* through
  *our* loop, not the exact production loop.
  - **Not affected:** the hard-rule guarantees. They are enforced in the tool
    handlers and checked on the event log, and both loops go through the
    same handlers. The model cannot get claim data before verification, and
    cannot record an out-of-policy plan, whichever loop drives it.
  - **Affected:** fidelity of the soft-rule evals. Vapi adds behaviour of its
    own (turn-taking, interruptions, possibly its own prompt wrapping
    **[unverified]**), so soft-rubric scores in text mode are a proxy.
  - **Mitigation:** generate the Vapi assistant config and the text-mode loop
    from one module (`agent/`), so the prompt and tool schemas cannot drift.
    The judge can also be run on transcripts of real voice calls.
- **Revisit:** Vapi's custom-LLM mode (Vapi calls our OpenAI-compatible
  endpoint) would restore a single loop without changing platform. It is the
  first upgrade if soft-rule evals diverge from real calls. At scale, moving
  to Pipecat or LiveKit is covered in scaling.md.

### D3: Backend, TypeScript + Hono

- **Options considered:** Python + FastAPI + Pydantic; TypeScript + Hono or
  Fastify + Zod.
- **Decision:** TypeScript + Hono for the backend. The web UI and the eval
  harness use TypeScript too.
- **Why:** one language across the whole repo. Vapi's web SDK is JS. Shared
  types between backend, UI and evals (session state, event shapes).
- **Consequence:** tool schemas are Zod schemas in `backend/domain`. The
  JSON Schema that goes into the Vapi tool config and the text-mode tool list
  is generated from them. Zod also validates every tool call before the
  policy engine sees it.
- **Tradeoff:** the self-hosted migration target in scaling.md (Pipecat) is
  Python. LiveKit Agents has a Node SDK **[verify maturity before relying on
  it]**, so it is the more natural TS-side option.

### D2: LLMs

- **Options considered:** for the agent, Sonnet 5.5, Haiku 5.5 or Opus 5.5.
  For the simulator and the judge, Sonnet 5.5 and Opus 5.5.
- **Decision:** the agent runs on `claude-sonnet-5-5`, selected in the Vapi
  assistant config for voice and called directly in text mode. The debtor
  simulator also runs on `claude-sonnet-5-5`. The judge runs on
  `claude-opus-5-5`, a stronger model than the agent with a separate rubric
  prompt. The evals also run the agent on `claude-haiku-5-5` for a cost and
  quality comparison.
- **Why:** voice needs a low time-to-first-token. Because the hard rules live
  in code, the agent model only carries the soft behaviour, so a mid-tier
  model is a reasonable default and the evals decide whether a smaller one is
  enough. Prices per 1M input/output tokens: Sonnet 5.5 $2/$10, Haiku 5.5
  $0.10/$0.50, Opus 5.5 $4/$20 (Anthropic list prices, Nov 2026).
- **Known gap (confirmed 2026-11-24 by Yulia in the Vapi UI):** Vapi's model
  picker does not offer Sonnet 5.5. The voice agent uses the newest Claude
  model Vapi offers, and text mode keeps Sonnet 5.5. The text-mode model
  should be switched to match whatever voice runs, so evals test the same
  model. Deferred to Phase 3. Per [research/vapi.md](research/vapi.md),
  Vapi lists Claude Haiku 5.5 and Sonnet 5 but not Sonnet 5.5, so the
  Phase 3 options are: (a) Haiku 5.5 in both modes, so there is no mismatch
  and evals already compare it; (b) Sonnet 5 in both; (c) custom-LLM mode
  with Sonnet 5.5. That model mismatch between voice and text is
  one more reason to consider custom-LLM mode (see D1).

### D4: Storage, `node:sqlite`

- **Options considered:** `node:sqlite`, `better-sqlite3`, in-memory,
  Postgres.
- **Decision:** `node:sqlite`, built into Node 22. The data is one
  append-only `events` table (session id, sequence number, type, JSON
  payload, timestamp) plus small tables for session state, the OTP and
  agreements.
- **Why:** no native build step and no Docker, so a reviewer can run it
  quickly. Data survives between runs and can be inspected. The hard checks
  in the evals are plain queries over `events`.
- **Tradeoff:** the module is still marked experimental in Node 22 and prints
  a warning. The event-log shape maps directly onto an append-only stream
  (Postgres or Kafka) at scale; see scaling.md.

### D5: Evals, thin harness on Vitest

- **Options considered:** a custom harness on Vitest, promptfoo, Braintrust,
  Inspect.
- **Decision:** each persona is a Vitest test. The test runs a simulated
  conversation in text mode, then asserts the hard checks against the event
  log (pass/fail, no LLM involved). It then calls the judge for rubric
  scores, which are written to `evals/results/` and never gate a pass.
- **Why:** there are no framework concepts to explain, and the hard checks
  are ordinary assertions. Multi-turn conversations with a simulated debtor
  fit poorly into promptfoo's single-prompt model.
- **Tradeoff:** no hosted dashboard or experiment tracking. Results are
  committed JSON and Markdown.
