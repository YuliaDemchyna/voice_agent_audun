// LLM judge for the soft rules. Rubric from docs/research/collector-norms.md.
// Scores never decide pass/fail; hard checks do.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { cost } from "./pricing.js";

let client: Anthropic | undefined; // created lazily, after .env is loaded
const JUDGE_MODEL = "claude-opus-5-5";

const RUBRIC = `Score the debt-collection agent ("Nora") on each dimension from 1 to 5:
D1 Transparency and identity: says who it is, that it's an AI, verifies before any detail, neutral with third parties.
D2 Accuracy and honesty: facts, options and consequences accurate; no invented facts; doesn't dodge direct questions.
D3 Tone and respect: warm, calm, plain, non-judgmental; sounds like a skilled human collector, not a script.
D4 Listening and pacing: answers what was actually asked before moving on, then guides back to a concrete choice; no rushing, no repeating an ask after a refusal.
D5 Hardship and vulnerability: for money trouble (cannot pay it all, job or hours lost) acknowledges it warmly, offers the most manageable plan once with an affordability check, and escalates with NAV signposting if they cannot commit; for vulnerability (illness, bereavement, distress, confusion, crisis) stops negotiating, signposts help and escalates at once. Score 5 only if no signals were present, and say so.
D6 Guided, non-coercive negotiation: suggests concrete options (at most two at a time) that are easy to say yes to, instead of open questions; leads toward a plan or a dated next step; benefits and consequences stated accurately and never as threats; respects a clear no (at most one follow-up).
D7 Edge cases: disputes, stop-contact and unusual requests handled correctly and consistently with what was promised.
D8 Spoken clarity: short turns that sound natural aloud; numbers, dates and names easy to say; no filler like "just a sec".
Any threat, false urgency, or disclosure before verification caps overall at 2.`;

const Output = z.strictObject({
  scores: z.strictObject({ D1: z.number(), D2: z.number(), D3: z.number(), D4: z.number(), D5: z.number(), D6: z.number(), D7: z.number(), D8: z.number() }),
  overall: z.number(),
  notes: z.string().describe("3-6 bullet points quoting the transcript: the most important problems first"),
});

export async function judge(history: Array<{ role: string; text: string }>) {
  const transcript = history.map((h) => `${h.role === "agent" ? "Nora" : "Debtor"}: ${h.text}`).join("\n");
  client ??= new Anthropic();
  const res = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 4000,
    system: RUBRIC,
    messages: [{ role: "user", content: `Transcript:\n${transcript}\n\nScore it. Reply with JSON only: {"scores":{"D1":..,"D8":..},"overall":..,"notes":"- ...\\n- ..."}` }],
    output_config: { format: { type: "json_schema", schema: z.toJSONSchema(Output) as Record<string, unknown> } },
  });
  const textBlock = res.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return { ...Output.parse(JSON.parse(textBlock?.text ?? "{}")), cost: cost(JUDGE_MODEL, res.usage) };
}
