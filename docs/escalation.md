# Escalation: what the human reviewer receives

The reviewer's job is to act **without calling the debtor back to re-ask**.
The ticket is built by the backend from the session state and the event log,
not written by the model. The model contributes one thing: a short free-text
`summary` in its `escalate` tool call, shown clearly labelled as
model-written. Everything else is facts the backend recorded.

## When a ticket is created

| Reason code | Trigger | Priority | Reviewer acts within |
|---|---|---|---|
| `crisis` | Self-harm or suicide mentioned, or acute panic | **P0** | Immediately *(target)* |
| `hardship` | Vulnerability or distress (illness, job loss, bereavement, "can't cope"), or possible lack of capacity (confusion, can't follow the options) | **P1** | 1 business day *(target)* |
| `dispute` | Debtor says the claim is wrong, paid, or not theirs | P2 | Written, reasoned answer (new act § 25) |
| `requested_human` | Debtor asks for a person | P2 | 1 week |
| `contact_preference` | Debtor asks to stop contact or to be contacted only in writing | P2 (compliance) | Applied at once by code; human review within 1 week |
| `agent_error` | A tool error or an unexpected state the agent couldn't recover from | P2 | 1 week |
| `debt_adviser` | Debtor is working with a debt adviser or NAV | P3 | Pause collection for about 30 days *(UK benchmark, FCA CONC 7.3.11)* |
| `out_of_policy` | Debtor wants terms the policy engine rejected (discount, more instalments, later start) and asks for review | P3 | 1 week |
| `verification_failed` | Lockout after too many wrong codes, or a third party claims authority | P3 | 1 week |
| `recording_declined` | Debtor declines recording (the opening tells them they can), so the call can't be quality-checked. The agent ends the call; locks the session | P3 | 1 week |

**Deadlines.** The legal floor is a reply to any debtor inquiry within
1 week, or an interim reply plus a decision on pausing collection (new act
§ 17). Anything marked *target* is our own internal goal, not a legal
requirement (see [assumptions.md](assumptions.md)).

Once a call escalates for `crisis`, `hardship`, `dispute`,
`contact_preference` or `debt_adviser`, the backend disables the negotiation
and confirmation tools for the rest of that session. The agent cannot keep
pushing for payment, or take an agreement, after a person has disputed the
claim, asked it to stop, or shown they may not be able to decide.

## Ticket contents

```jsonc
{
  "ticket_id": "esc_01J...",
  "created_at": "2026-11-24T14:32:10+01:00",
  "reason": "dispute",                       // reason code above
  "priority": "P2",

  // Who, and how sure we are it was them
  "debtor": { "id": "deb_001", "name": "Ola Nordmann", "phone": "+47 4xx xx xxx" },
  "identity": { "verified": true, "method": "sms_otp", "verified_at": "...", "failed_attempts": 0 },

  // What it's about (only included if verified; otherwise "not disclosed")
  "claim": { "id": "clm_001", "creditor": "...", "amount_nok": 3000, "due_date": "...", "status": "paused_pending_review" },

  // What the debtor wants, in their words, plus structured fields
  "debtor_request": {
    "quote": "I paid this in October, I have the receipt.",   // verbatim from the transcript
    "requested_terms": null                                   // e.g. { "instalments": 6 } for out_of_policy
  },

  // What the agent already did, so the reviewer doesn't repeat it
  "attempted": [
    { "type": "plan_proposed", "terms": { "instalments": 3 }, "policy_result": "approved" },
    { "type": "plan_proposed", "terms": { "discount_pct": 20 }, "policy_result": "rejected", "reason": "discounts_not_allowed" }
  ],

  // What the debtor was told will happen next. The reviewer must honour this.
  "promised_to_debtor": "A person will review your receipt and contact you within 5 business days. Collection is paused meanwhile.",
  "contact_preference": { "channel": "sms", "do_not_call": false, "best_time": "evenings" },

  // Signals for the reviewer
  "flags": ["hardship_signals: job_loss"],          // detected signals, if any
  "agent_summary": "Debtor says the claim was paid on 12 Oct...",   // model-written, labelled as such

  // Evidence
  "transcript_url": "/sessions/ses_123/transcript",
  "event_log_url": "/sessions/ses_123/events",
  "recording_url": null                              // not in prototype
}
```

## Design choices

- **Facts come from the backend, not the model.** Identity status, claim data,
  policy results and the plans proposed are copied from the event log, so a
  hallucinated summary can't mislead the reviewer. The model's summary is
  context only.
- **The verbatim quote.** The reviewer sees what the debtor actually said,
  not the model's paraphrase. This matters most for disputes and hardship.
- **"Promised to debtor" is a field.** Whatever the agent said would happen
  next is a commitment the reviewer must keep. Putting it in the ticket makes
  broken promises visible.
- **No claim data in tickets for unverified calls.** A `verification_failed`
  ticket shows that a call happened and why it failed. Debtor identity comes
  from the contact record, not from anything the caller said.

## In the prototype

Tickets are written to SQLite and shown in the UI after the call. 📐 Not
built: a reviewer queue UI, SLA timers, assignment, and recording links.
