# Scaling to millions of concurrent calls

How this prototype would grow from one call at a time
([assumptions.md](assumptions.md) A1) to about a million concurrent calls.
Nothing here is built. Figures marked **[rough]** are order-of-magnitude
estimates, not quotes. Vapi figures come from
[research/vapi.md](research/vapi.md) (checked 2026-11-24).

## Assumptions

Norway has about 5.5 million people. A million concurrent calls is more than
Norway will ever need: at the rate below, it would call every person in the
country about three times an hour. So we treat the target as a
**multi-tenant platform**, with many collectors (and later countries) on one
system.

| Assumption | Value | Why |
|---|---|---|
| Concurrent calls at peak | 1,000,000 | The brief |
| Average call length | 4 min | Verify, explain, agree, follow up |
| Answer rate | ~1 in 3 dials | Typical for outbound collection **[rough]** |
| Calling hours | Weekdays 08–21, Saturdays 09–15 | [rulebook.md](rulebook.md) N9; no calls on Sundays or holidays |
| Escalation rate | ~10% of answered calls | Disputes, hardship, human requests |

**The math at peak:**

| Quantity | Calculation | Result |
|---|---|---|
| Answered calls | 1M lines × (60 / 4) calls per line per hour | **~15M calls/hour** |
| Dials | 15M × 3 | ~45M dials/hour, ~12,500 per second |
| Escalation tickets | 15M × 10% | **~1.5M tickets/hour** |
| Call minutes | 15M × 4 min | ~60M min/hour |

Load is peaky. Calling hours are fixed by law, so traffic bunches inside
the window and drops to zero outside it. We size for the peak and scale down
at night and on Sundays.

## Outbound means we control the load

The agent makes the calls. Nobody can flood it with inbound traffic. That
makes the **scheduler and dialer the valve** for the whole system.

The dialer decides how many calls to start each second, based on:

- **Downstream capacity:** free reviewer slots, LLM headroom, telephony
  capacity, cell headroom. It dials as fast as the slowest part can absorb.
- **Contact rules:** calling hours, and at most 1 attempt a day, 5 a week and
  15 a month per debtor (N9). Stop-contact and written-only preferences are
  respected before a number is ever dialled.

When something downstream slows, the dialer dials less. No call is dropped
mid-conversation, because calls that would overload the system never start.

## Bottlenecks, in order

### 1. The human review queue (the real limit)

At 10% escalation, 1.5M tickets an hour reach people. If a reviewer handles
a ticket in about 5 minutes **[rough]**, that is ~12 tickets per reviewer per
hour, or **~125,000 reviewers on shift**. No amount of GPUs fixes that.

This is why **escalation precision matters** at scale. Our final eval had
91% precision ([evals/REPORT.md](../evals/REPORT.md)). At this volume, 9%
needless hand-offs is ~135,000 wasted tickets an hour. Recall stays the
priority (never miss a crisis), but every point of precision is reviewer
hours.

What helps:

- **Priority queues:** crisis first, then hardship and disputes, then the
  rest ([escalation.md](escalation.md)).
- **The dialer paces on queue depth**, so we never create more tickets than
  people can handle within the SLA.
- **Not every flag is a hand-off:** `financial_difficulty` is a P3 review
  flag with no state change, not a ticket that blocks the claim.
- **Better tickets:** a reviewer gets the reason, the transcript and the event
  log, so handle time drops.

### 2. LLM throughput

1M calls with a model turn every ~10 seconds is **~100,000 requests per
second**, before tool round trips, which add more. Each request carries the
prompt, tool schemas and history (several thousand tokens), so input volume
is in the hundreds of millions of tokens per second **[rough]**.

| Lever | What it does |
|---|---|
| Prompt caching | The prompt and tool schemas are identical across calls, so most input tokens are cache reads. Haiku 4.5 needs at least 4,096 tokens to cache. |
| Provisioned throughput | Reserved capacity under contract instead of shared rate limits |
| Several providers | The same Claude model through the Anthropic API, Amazon Bedrock and Google Vertex AI, for capacity and failover |
| A smaller model | Only if the eval suite proves it. Haiku 5.5 is listed at 10× cheaper than Haiku 4.5 ([REPORT.md](../evals/REPORT.md), decision 4). The eval suite is the gate. |

### 3. Telephony

~12,500 dials per second at peak is far beyond one carrier trunk's
calls-per-second (CPS) limit. We need many SIP trunks across several
carriers.

**Number reputation** is the quieter limit. Numbers that dial a lot get
labelled as spam, and the answer rate falls. That means a large pool of
numbers registered to the collector, a cap on dials per number, and
watching answer rates per number.

### 4. Speech (STT and TTS)

Every live call holds a streaming speech-to-text session, and a
text-to-speech stream while the agent talks. At 1M calls that is about a
million STT streams on GPUs. Whether we use vendors or self-host, this needs
capacity contracts or our own GPU fleet, spread across regions. Throughput
per GPU depends on the model; measure it before sizing **[unverified]**.

### 5. The backend (the easy part)

The backend is built to scale out:

| Today | At scale |
|---|---|
| Hono webhook handlers | Same code, stateless, behind a load balancer. Any instance can serve any tool call. |
| `node:sqlite` sessions | Postgres, sharded by tenant and debtor |
| Append-only `events` table | Kafka (or another log) for events, with Postgres or a warehouse as readers |
| Session state loaded per tool call | Redis for hot state (verified flag, code attempts, locks), with a TTL per call |

The domain layer has no I/O, so none of this touches the rules.

### 6. Follow-ups

Follow-up SMS go through a **queue with an outbox**. The domain already
emits `sms_sent` in the same batch of events as `agreement_recorded`. At
scale both are written in one transaction, and a worker sends the outbox
with retries and an idempotency key. So **an agreement is never recorded
without its SMS**, and a retry never sends it twice.

## Leaving Vapi

Vapi is right for the prototype ([architecture.md](architecture.md#decision-log),
D1). It is not right for 1M concurrent calls:

| Vapi cost item | At 1M concurrent |
|---|---|
| Hosting fee, $0.05/min | 60M min/hour × $0.05 = **~$3M an hour** in platform fees alone |
| Extra concurrency, $10/line/month | 1M lines × $10 = **~$10M a month** |

We'd also be limited by one vendor's capacity, and our conversation loop
would be theirs.

**Three phases:**

| Phase | Setup | When |
|---|---|---|
| 1. Vapi + custom-LLM mode | Vapi still handles telephony and speech, but calls our OpenAI-compatible endpoint for every turn. We own the loop, model routing, caching and failover. Text evals and live calls run the same loop. | Thousands of concurrent calls |
| 2. Our own voice stack | LiveKit Agents (Node SDK, fits our TypeScript) or Pipecat (Python), with our own SIP trunks and speech vendors under contract | Tens to hundreds of thousands |
| 3. Cell-based architecture | A **control plane** (tenants, campaigns, scheduler and dialer, policy config, prompt versions, eval gate, reviewer tools) over many identical **data-plane cells**. Each cell holds media servers, agent workers, speech and a session store, has a fixed size, and fails on its own. Cells sit in regions that match data-residency rules (EEA for Norway). | Up to 1M and beyond |

**Only `transport/` changes.** The split is `transport → conversation →
domain`. A new voice stack means a new adapter next to
`backend/transport/vapi.ts`. The rules in `domain/`, the tools in
`conversation/`, the prompt in `agent/` and the evals stay the same. LiveKit's
Node SDK maturity needs checking before we rely on it (architecture.md D3).

## Cost per minute

Per minute of answered call. All figures are **[rough]**.

| Item | Vapi (today) | Self-hosted (phase 2–3) |
|---|---|---|
| Platform fee | $0.05 | $0 |
| STT + TTS | ~$0.03–0.06 (passed through at cost) | ~$0.01–0.02 (volume contracts or own GPUs) |
| LLM | ~$0.003 | ~$0.003, less with caching or a smaller model |
| Telephony | Included or passed through | ~$0.005–0.01 (own SIP trunks) |
| Infrastructure | Included | ~$0.005 |
| **Total** | **~$0.08–0.13** (Vapi's calculator example) | **~$0.02–0.04** |

The LLM figure comes from our eval: **$0.011 per call** on Haiku 4.5, about
$0.003 a minute over 4 minutes. Text-mode eval calls are shorter than real
voice calls, so the real figure is probably higher.

**Cost per minute is the wrong headline.** The better metric is **cost per
resolved claim**: everything spent (dials, minutes, SMS, reviewer time),
divided by claims that end in a kept plan or a payment. A 4-minute call costs
about $0.12–0.50 in voice. A 5-minute review ticket costs dollars in people
time. So escalation precision and the kept-promise rate move this number
more than the voice stack does.

## When things fail

- **Provider failover.** Each dependency (LLM, STT, TTS, carrier) has a
  second provider. If one fails mid-call, the agent says a scripted line and
  offers a callback. It never improvises.
- **Backpressure.** The dialer reads latency, queue depth and error rates. It
  slows down before anything breaks. We degrade by making fewer calls, not
  worse ones.
- **Hard rules don't degrade.** If the backend is unreachable, the agent
  cannot verify, disclose or record anything, because those only happen
  through tools. The system fails closed. Under load we may make fewer calls
  or use a smaller model, but never prompt-only rules.

## Metrics to watch in production

| Metric | Why |
|---|---|
| Cost per resolved claim | The headline efficiency number |
| Kept-promise rate | Agreements that are actually paid |
| Right-party contact rate | Answered calls that reach and verify the debtor |
| Escalation rate and reviewer overturn rate | Overturns are real-world outcome accuracy ([EVALUATION.md](../evals/EVALUATION.md)) |
| Reviewer queue depth, time to first human contact (by priority) | The real bottleneck; crisis must be fast |
| Complaint rate | Tone and pressure, measured by the people called |
| Hard-rule violations on the event log | Must stay at 0 |
| Voice-to-voice latency per turn, p50 and p95 | Callers hang up on slow agents |
| Tool and provider error rates, failovers | Early warning |
| LLM cache hit rate | Cost |
| Answer rate per number, spam flags | Number reputation |
| SMS delivery rate | Follow-ups must arrive |
