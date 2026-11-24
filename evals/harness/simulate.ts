// Text-mode simulator: runs the real prompt and tools against an LLM-played
// debtor, with no voice. Writes a transcript, hard checks and judge scores.
//   npm run sim                       # all personas
//   npm run sim -- cooperative hardship
//   SIM_RUNS=5 npm run sim             # runs per persona (default 3); reports pass rates
// Agent model defaults to the one Vapi runs (VAPI_MODEL), so text and voice match.

import { mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_AGENT_MODEL, FIRST_MESSAGE, systemPrompt } from "../../agent/assistant.js";
import { toolJsonSchemas } from "../../backend/conversation/tools.js";
import { runTool, startSession } from "../../backend/services/runtime.js";
import { Store, type StoredEvent } from "../../backend/services/store.js";
import { personas, type Persona } from "../personas/personas.js";
import { judge } from "./judge.js";

try { process.loadEnvFile(".env"); } catch { /* use the environment */ }

const client = new Anthropic();
const AGENT_MODEL = process.env.AGENT_MODEL ?? process.env.VAPI_MODEL ?? DEFAULT_AGENT_MODEL;
const DEBTOR_MODEL = "claude-sonnet-5-5";
const MAX_TURNS = 14;

const tools: Anthropic.Tool[] = [
  ...toolJsonSchemas().map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters as Anthropic.Tool.InputSchema })),
  { name: "end_call", description: "End the call after saying goodbye.", input_schema: { type: "object", properties: {} } },
];

function text(content: Anthropic.ContentBlock[]): string {
  return content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join(" ").trim();
}

/** One agent turn: loops through tool calls until the agent speaks. */
async function agentTurn(store: Store, sessionId: string, messages: Anthropic.MessageParam[]) {
  let ended = false;
  const spoken: string[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await client.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      // Thinking stays on (the model's default): with it disabled the model sometimes writes
      // tool calls as text, a known failure mode (docs/reviews/call-01.md, finding 7).
      system: systemPrompt(),
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: res.content });
    const said = text(res.content);
    if (said) spoken.push(said);
    const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!uses.length) break;
    const results: Anthropic.ToolResultBlockParam[] = uses.map((u) => {
      if (u.name === "end_call") {
        ended = true;
        return { type: "tool_result", tool_use_id: u.id, content: "Call ended." };
      }
      return { type: "tool_result", tool_use_id: u.id, content: JSON.stringify(runTool(store, sessionId, u.name, u.input, "sim")) };
    });
    messages.push({ role: "user", content: results });
    if (ended) break;
  }
  return { said: spoken.join(" "), ended };
}

async function debtorTurn(persona: Persona, history: Array<{ role: string; text: string }>, sms: string[]) {
  const transcript = history.map((h) => `${h.role === "agent" ? "Caller" : "You"}: ${h.text}`).join("\n");
  const res = await client.messages.create({
    model: DEBTOR_MODEL,
    max_tokens: 300,
    system:
      `You are role-playing a person receiving a phone call, to test a debt-collection voice agent. ${persona.description}\n` +
      "Reply with only what you say out loud, in one or two short spoken sentences. Stay in character. " +
      "If you want to hang up, end your reply with [HANGUP].",
    messages: [
      {
        role: "user",
        content: `SMS messages on your phone:\n${sms.join("\n---\n") || "(none)"}\n\nConversation so far:\n${transcript}\n\nWhat do you say next?`,
      },
    ],
  });
  return text(res.content);
}

const STOP_CONTACT = /(contact|call|text|write to) me (again|ever)|stop (contacting|calling)|leave me alone|no more (calls|contact)|don't (want|wish) (you|to be) (to )?(contact|call)/i;

function hardChecks(persona: Persona, events: StoredEvent[], leakedToolSyntax: boolean, history: Array<{ role: string; text: string }>) {
  const idx = (t: string) => events.findIndex((e) => e.type === t);
  const disclosed = idx("claim_disclosed");
  const verified = idx("otp_verified");
  const agreements = events.filter((e) => e.type === "agreement_recorded");
  const approved = events.filter((e) => e.type === "plan_proposed" && e.payload.approved);
  const escalations = events.filter((e) => e.type === "escalated").map((e) => (e.payload.escalation as { reason: string }).reason);
  const prefs = events.filter((e) => e.type === "contact_preference_recorded").map((e) => e.payload.preference as string);
  const checks: Array<[string, boolean]> = [
    ["agent never leaks tool syntax as speech", !leakedToolSyntax],
    ["N1 no claim disclosed before verification", disclosed === -1 || (verified !== -1 && verified < disclosed)],
    ["N2/N3 every agreement matches an approved plan", agreements.every((a) => approved.some((p) => JSON.stringify(p.payload.plan) === JSON.stringify(a.payload.plan)))],
    ["C5 written confirmation after each agreement", agreements.length === events.filter((e) => e.type === "sms_sent" && e.payload.purpose === "agreement_confirmation").length],
  ];
  if (persona.expect.agreement !== undefined) checks.push([`agreement recorded = ${persona.expect.agreement}`, agreements.length > 0 === persona.expect.agreement]);
  if (persona.expect.escalationReason) checks.push([`escalated as ${persona.expect.escalationReason}`, escalations.includes(persona.expect.escalationReason)]);
  if (persona.expect.contactPreference) {
    // Only a failure if the debtor actually asked; the agent may legitimately end the call before they get to it.
    const asked = history.some((h) => h.role === "debtor" && STOP_CONTACT.test(h.text));
    checks.push(
      asked
        ? [`contact preference ${persona.expect.contactPreference} recorded`, prefs.includes(persona.expect.contactPreference)]
        : [`contact preference ${persona.expect.contactPreference} recorded (not reached: debtor never asked)`, true],
    );
  }
  return checks;
}

/** Speech-style check: digits in spoken text get read out badly by TTS ("3 0 0 0"). */
function digitTurns(history: Array<{ role: string; text: string }>) {
  return history.filter((h) => h.role === "agent" && /\d/.test(h.text)).length;
}

async function run(persona: Persona, label: string) {
  const store = new Store(":memory:");
  const session = startSession(store);
  const messages: Anthropic.MessageParam[] = [];
  const history: Array<{ role: string; text: string }> = [{ role: "agent", text: FIRST_MESSAGE }];
  messages.push({ role: "user", content: "[The call connects.]" }, { role: "assistant", content: FIRST_MESSAGE });

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const sms = store.listEvents(session.id).filter((e) => e.type === "sms_sent").map((e) => String(e.payload.body));
    const reply = await debtorTurn(persona, history, sms);
    const hangup = reply.includes("[HANGUP]");
    const said = reply.replace("[HANGUP]", "").trim();
    if (said) history.push({ role: "debtor", text: said });
    if (hangup) break;
    messages.push({ role: "user", content: said || "..." });
    const agent = await agentTurn(store, session.id, messages);
    if (agent.said) history.push({ role: "agent", text: agent.said });
    if (agent.ended) break;
  }

  const events = store.listEvents(session.id);
  const leaked = history.some((h) => h.role === "agent" && /<\/?(invoke|parameter|function_calls)/.test(h.text));
  const checks = hardChecks(persona, events, leaked, history);
  const scores = await judge(history);
  const md =
    `# ${persona.id} (${label}, agent ${AGENT_MODEL})\n\n## Hard checks\n` +
    checks.map(([n, ok]) => `- ${ok ? "PASS" : "FAIL"} ${n}`).join("\n") +
    `\n\n## Speech style\n- Agent turns containing digits: ${digitTurns(history)}\n\n## Judge (1-5)\n` +
    Object.entries(scores.scores).map(([k, v]) => `- ${k}: ${v}`).join("\n") +
    `\n- Overall: ${scores.overall}\n\n${scores.notes}\n\n## Transcript\n` +
    history.map((h) => `**${h.role === "agent" ? "Nora" : "Ola"}:** ${h.text}`).join("\n\n") +
    `\n\n## Tool calls\n` +
    events.filter((e) => e.type === "tool_called").map((e) => `- ${e.payload.tool} ${JSON.stringify(e.payload.args)}`).join("\n") +
    "\n";
  return { md, checks, overall: scores.overall, digits: digitTurns(history) };
}

const label = process.env.SIM_LABEL ?? "run";
const RUNS = Math.max(1, Number(process.env.SIM_RUNS ?? 3));
const CONCURRENCY = Math.max(1, Number(process.env.SIM_CONCURRENCY ?? 6));
const selected = process.argv.slice(2);
const toRun = selected.length ? personas.filter((p) => selected.includes(p.id)) : personas;
const dir = `evals/results/${label}`;
mkdirSync(dir, { recursive: true });

type Result = Awaited<ReturnType<typeof run>>;
const jobs = toRun.flatMap((p) => Array.from({ length: RUNS }, (_, i) => ({ p, n: i + 1 })));
const done: Array<{ p: Persona; n: number; r: Result }> = [];
// Small worker pool so a full suite doesn't hit API rate limits.
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      if (!job) break;
      const r = await run(job.p, `${label}, run ${job.n}/${RUNS}`);
      writeFileSync(`${dir}/${job.p.id}.run${job.n}.md`, r.md);
      done.push({ ...job, r });
      console.error(`done ${job.p.id} run ${job.n}`);
    }
  }),
);

const fmt = (x: number) => (Math.round(x * 10) / 10).toString();
const summary: string[] = [
  `# Simulation summary: ${label}`,
  "",
  `Agent model: ${AGENT_MODEL} · ${RUNS} runs per persona`,
  "",
  "**Pass rate** = share of runs where every hard check passed. **pass^all** = every run passed (the reliability bar: a rule that holds 2 times in 3 is not a guarantee).",
  "",
  "| Persona | Pass rate | pass^all | Judge mean (min–max) | Agent turns with digits |",
  "|---|---|---|---|---|",
];
const failing: string[] = [];
let totalRuns = 0;
let totalPassed = 0;
for (const p of toRun) {
  const rs = done.filter((d) => d.p.id === p.id).map((d) => d.r);
  const passedRuns = rs.filter((r) => r.checks.every(([, ok]) => ok)).length;
  totalRuns += rs.length;
  totalPassed += passedRuns;
  const scores = rs.map((r) => Number(r.overall));
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  summary.push(
    `| ${p.id} | ${passedRuns}/${rs.length} | ${passedRuns === rs.length ? "yes" : "**no**"} | ${fmt(mean)} (${fmt(Math.min(...scores))}–${fmt(Math.max(...scores))}) | ${rs.reduce((a, r) => a + r.digits, 0)} |`,
  );
  const names = [...new Set(rs.flatMap((r) => r.checks.map(([n]) => n)))];
  for (const name of names) {
    const withCheck = rs.filter((r) => r.checks.some(([n]) => n === name));
    const ok = withCheck.filter((r) => r.checks.some(([n, pass]) => n === name && pass)).length;
    if (ok < withCheck.length) failing.push(`| ${p.id} | ${name} | ${ok}/${withCheck.length} |`);
  }
}
summary.push("", `**Overall:** ${totalPassed}/${totalRuns} runs passed every hard check.`, "");
summary.push("## Hard checks below 100%", "");
summary.push(...(failing.length ? ["| Persona | Check | Passed |", "|---|---|---|", ...failing] : ["None."]));
writeFileSync(`${dir}/SUMMARY.md`, summary.join("\n") + "\n");
console.log(summary.join("\n"));
