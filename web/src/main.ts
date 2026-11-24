import VapiImport from "@vapi-ai/web";

// @vapi-ai/web is CommonJS with `exports.default`; when bundled, the class can
// end up one `.default` deeper than TypeScript expects.
type VapiClient = InstanceType<typeof VapiImport>;
const Vapi = ((VapiImport as unknown as { default?: typeof VapiImport }).default ?? VapiImport) as typeof VapiImport;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const startBtn = $<HTMLButtonElement>("start");
const callBtn = $<HTMLButtonElement>("call");
const hangupBtn = $<HTMLButtonElement>("hangup");
const statusEl = $("status");

let sessionId: string | undefined;
let vapi: VapiClient | undefined;
let assistantId = "";
let partial: HTMLElement | undefined;

async function init() {
  const config = (await (await fetch("/api/config")).json()) as { vapiPublicKey: string; assistantId: string };
  assistantId = config.assistantId;
  if (!config.vapiPublicKey || !assistantId) {
    statusEl.textContent = "Missing VAPI_PUBLIC_KEY or VAPI_ASSISTANT_ID in .env (run npm run vapi:sync)";
    return;
  }
  vapi = new Vapi(config.vapiPublicKey);
  vapi.on("call-start", () => setStatus("in call"));
  vapi.on("call-end", () => {
    setStatus("call ended");
    hangupBtn.disabled = true;
    callBtn.disabled = false;
  });
  vapi.on("error", (e: unknown) => setStatus(`error: ${JSON.stringify(e).slice(0, 200)}`));
  vapi.on("message", (m: { type: string; role?: string; transcript?: string; transcriptType?: string }) => {
    if (m.type !== "transcript" || !m.transcript) return;
    if (m.transcriptType === "partial") return showPartial(m.role ?? "?", m.transcript);
    addLine(m.role ?? "?", m.transcript);
    if (sessionId) {
      void fetch(`/api/sessions/${sessionId}/transcript`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: m.role, text: m.transcript }),
      });
    }
  });
}

function setStatus(s: string) {
  statusEl.textContent = s;
}

function showPartial(role: string, text: string) {
  if (!partial) {
    partial = document.createElement("div");
    partial.className = "line partial";
    $("transcript").append(partial);
  }
  partial.innerHTML = `<b>${role}</b>${escapeHtml(text)}`;
}

function addLine(role: string, text: string) {
  partial?.remove();
  partial = undefined;
  const div = document.createElement("div");
  div.className = "line";
  div.innerHTML = `<b>${role}</b>${escapeHtml(text)}`;
  $("transcript").append(div);
  $("transcript").scrollTop = 1e9;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
}

startBtn.onclick = async () => {
  const s = (await (await fetch("/api/sessions", { method: "POST" })).json()) as { id: string };
  sessionId = s.id;
  $("transcript").innerHTML = "";
  callBtn.disabled = !vapi;
  setStatus(`contact started: ${sessionId}`);
};

callBtn.onclick = async () => {
  if (!vapi || !sessionId) return;
  callBtn.disabled = true;
  hangupBtn.disabled = false;
  setStatus("connecting…");
  await vapi.start(assistantId, { variableValues: { sessionId } });
};

hangupBtn.onclick = () => vapi?.stop();

interface View {
  session: Record<string, unknown>;
  events: Array<{ seq: number; type: string; payload: Record<string, unknown>; ts: string }>;
  sms: Array<{ ts: string; purpose: string; body: string }>;
  tickets: unknown[];
}

async function poll() {
  if (sessionId) {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) render((await res.json()) as View);
  }
  setTimeout(poll, 1000);
}

function render(v: View) {
  $("sms").innerHTML = v.sms.map((m) => `<div class="msg">${escapeHtml(m.body)}</div>`).join("") || "<i>No messages yet</i>";
  const { debtor, claim, ...rest } = v.session;
  $("session").textContent = JSON.stringify(rest, null, 2);
  $("events").innerHTML = v.events
    .filter((e) => e.type !== "transcript")
    .map((e) => {
      const bad = e.type === "tool_rejected" || (e.type === "plan_proposed" && !e.payload.approved) || e.type === "otp_failed";
      const detail = e.type === "tool_called" ? `${e.payload.tool} ${JSON.stringify(e.payload.args)}` : JSON.stringify(e.payload).slice(0, 160);
      return `<div class="ev${bad ? " bad" : ""}"><code>${e.type}</code> ${escapeHtml(detail)}</div>`;
    })
    .join("");
  $("tickets").textContent = v.tickets.length ? JSON.stringify(v.tickets, null, 2) : "None";
}

void init();
void poll();
