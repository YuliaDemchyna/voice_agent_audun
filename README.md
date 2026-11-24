# Audun take-home: debt-collection voice agent

A voice agent that contacts a debtor, verifies identity with a one-time code,
answers questions about the claim, negotiates within policy, and follows up in
writing after the call.

> **Status:** Phase 0 (setup). Stack decisions are pending; see
> [docs/architecture.md](docs/architecture.md#decision-log).

## The idea in one paragraph

Hard rules live in code, not in the prompt. The model can only *propose*
actions through tool calls (`verify_code`, `propose_payment_plan`,
`confirm_agreement`, `escalate`). A deterministic backend decides what happens
and returns a reason the agent can say out loud. The model never sees claim
data until the backend has verified the code. Soft rules (tone, pacing,
recognising hardship) are captured in an eval rubric. Evals come first and the
prompt is tuned against them. Conversation logic runs in **text mode**, and
voice is a thin transport on top, so the agent can be tested without talking
to it.

## Repository layout

```
docs/                 product, journey, rulebook, escalation, assumptions,
                      architecture (+ decision log), scaling, presentation
agent/                prompt (versioned) and voice-platform config, as code
backend/
  domain/             pure rules: claim, OTP verification, policy engine,
                      session state machine. No I/O, no LLM.
  conversation/       text-mode agent loop: LLM call + tool dispatch into domain
  transport/          voice adapter(s); swappable, holds no business logic
  services/           event log, follow-up dispatch (mocked), escalation tickets
  api/                HTTP/WebSocket routes for the web UI
web/                  browser UI: start contact, mock SMS inbox, call,
                      live transcript + event log, post-call artefacts
evals/
  personas/           debtor personas (cooperative, disputer, hardship, ...)
  rubric/             soft-behaviour rubric derived from synthetic calls
  harness/            LLM-plays-debtor runner, hard checks, LLM judge
  results/            committed run outputs (before/after prompt changes)
```

The dependency direction is `transport -> conversation -> domain`, and
`evals -> conversation`. `domain` imports nothing from the others. That is
how "hard rules are code" shows up in the folder structure.

## Running locally

_TBD once the stack is chosen._

## Docs

- [Architecture and decision log](docs/architecture.md)
- [Assumptions](docs/assumptions.md)
