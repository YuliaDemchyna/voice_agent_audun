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
| D2 | 2026-11-24 | LLM(s) for agent, debtor simulator, judge | Pending |
| D3 | 2026-11-24 | Backend: **TypeScript + Hono**, one language across backend, web and evals | Accepted |
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
