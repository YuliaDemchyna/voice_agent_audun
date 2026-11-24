import VapiImport from "@vapi-ai/web";

// @vapi-ai/web is CommonJS with `exports.default`; when bundled, the class can
// end up one `.default` deeper than TypeScript expects.
type VapiClient = InstanceType<typeof VapiImport>;
const Vapi = ((VapiImport as unknown as { default?: typeof VapiImport }).default ?? VapiImport) as typeof VapiImport;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const callBtn = $<HTMLButtonElement>("call");
const hangupBtn = $<HTMLButtonElement>("hangup");
const resetBtn = $<HTMLButtonElement>("reset");

interface StoredEvent { seq: number; type: string; payload: Record<string, unknown>; ts: string }
interface View {
  session: Record<string, unknown>;
  events: StoredEvent[];
  sms: Array<{ ts: string; purpose: string; body: string }>;
  tickets: unknown[];
}
interface HistoryItem { id: string; startedAt: string; state: string; outcome: string }

const SPEAKER: Record<string, string> = { assistant: "Nora", user: "Ola" };

let vapi: VapiClient | undefined;
let assistantId = "";
/** The session on screen: the live call, or one picked from history. */
let viewingId: string | undefined;
let liveId: string | undefined;
let inCall = false;
let partial: { role: string; text: string } | undefined;

// iPhone-style Dynamic Island: green phone icon, waveform while Nora talks, call timer.
const phoneEl = document.querySelector(".phone") as HTMLElement;
const timerEl = document.getElementById("call-timer") as HTMLElement;
let timerHandle: ReturnType<typeof setInterval> | undefined;
function setCallIndicator(on: boolean) {
  clearInterval(timerHandle);
  phoneEl.classList.toggle("in-call", on);
  phoneEl.classList.remove("speaking");
  timerEl.textContent = "0:00";
  if (!on) return;
  const started = Date.now();
  timerHandle = setInterval(() => {
    const s = Math.floor((Date.now() - started) / 1000);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, 1000);
}

async function init() {
  const config = (await (await fetch("/api/config")).json()) as { vapiPublicKey: string; assistantId: string };
  assistantId = config.assistantId;
  if (!config.vapiPublicKey || !assistantId) {
    setStatus("Missing VAPI_PUBLIC_KEY or VAPI_ASSISTANT_ID in .env (run npm run vapi:sync)");
    return;
  }
  vapi = new Vapi(config.vapiPublicKey);
  callBtn.disabled = false;
  vapi.on("call-start", () => {
    setStatus("in call with Ola");
    setCallIndicator(true);
  });
  vapi.on("speech-start", () => phoneEl.classList.add("speaking"));
  vapi.on("speech-end", () => phoneEl.classList.remove("speaking"));
  vapi.on("call-end", () => {
    inCall = false;
    setCallIndicator(false);
    partial = undefined;
    setStatus("call ended");
    hangupBtn.disabled = true;
    callBtn.disabled = false;
    void refreshHistory();
  });
  vapi.on("error", (e: unknown) => setStatus(`error: ${JSON.stringify(e).slice(0, 160)}`));
  vapi.on("message", (m: { type: string; role?: string; transcript?: string; transcriptType?: string }) => {
    if (m.type !== "transcript" || !m.transcript || !liveId) return;
    const role = m.role ?? "?";
    if (m.transcriptType === "partial") {
      partial = { role, text: m.transcript };
      if (viewingId === liveId) renderTranscript(lastEvents);
      return;
    }
    partial = undefined;
    // Final lines go to the event log; the transcript is rendered from there,
    // so live calls and history look the same.
    void fetch(`/api/sessions/${liveId}/transcript`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, text: m.transcript }),
    }).then(() => load(liveId!));
  });
}

function setStatus(s: string) {
  $("status").textContent = s;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
}

function clock(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// One action, like a real outbound call: create the contact session, then dial.
callBtn.onclick = async () => {
  if (!vapi) return;
  callBtn.disabled = true;
  const s = (await (await fetch("/api/sessions", { method: "POST" })).json()) as { id: string };
  liveId = viewingId = s.id;
  inCall = true;
  hangupBtn.disabled = false;
  setStatus("calling Ola…");
  $("transcript-title").textContent = "Live transcript";
  await refreshHistory();
  await load(s.id);
  await vapi.start(assistantId, { variableValues: { sessionId: s.id } });
};

hangupBtn.onclick = () => vapi?.stop();

// "New demo": stop anything running and clear the screen for the next scenario.
resetBtn.onclick = () => {
  if (inCall) vapi?.stop();
  inCall = false;
  setCallIndicator(false);
  liveId = viewingId = undefined;
  partial = undefined;
  lastEvents = [];
  hangupBtn.disabled = true;
  callBtn.disabled = !vapi;
  $("transcript-title").textContent = "Live transcript";
  $("transcript").innerHTML = '<p class="empty">Press <b>Call Ola</b> to start.</p>';
  $("sms").innerHTML = '<div class="none">No messages</div>';
  $("events").innerHTML = "";
  $("tickets").textContent = "None";
  $("ticket-count").textContent = "";
  $("session").textContent = "";
  setStatus("ready");
  void refreshHistory();
};

async function refreshHistory() {
  const items = (await (await fetch("/api/sessions")).json()) as HistoryItem[];
  $("history").innerHTML = items
    .map(
      (h) =>
        `<li data-id="${h.id}" class="${h.id === viewingId ? "selected" : ""}">` +
        `<div class="when">${new Date(h.startedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}${h.id === liveId && inCall ? " · live" : ""}</div>` +
        `<div class="outcome">${esc(h.outcome)}</div></li>`,
    )
    .join("");
  for (const li of $("history").querySelectorAll("li")) {
    li.addEventListener("click", () => {
      viewingId = (li as HTMLElement).dataset.id;
      partial = undefined;
      $("transcript-title").textContent = viewingId === liveId && inCall ? "Live transcript" : "Call transcript (history)";
      void refreshHistory();
      void load(viewingId!);
    });
  }
}

let lastEvents: StoredEvent[] = [];

async function load(id: string) {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok || id !== viewingId) return;
  render((await res.json()) as View);
}

function renderTranscript(events: StoredEvent[]) {
  const lines = events.filter((e) => e.type === "transcript").map((e) => ({ role: String(e.payload.role), text: String(e.payload.text) }));
  if (partial && viewingId === liveId) lines.push({ ...partial, text: `\u0000${partial.text}` });
  // Merge consecutive fragments from the same speaker into one bubble.
  const turns: Array<{ role: string; parts: string[] }> = [];
  for (const l of lines) {
    const last = turns[turns.length - 1];
    if (last && last.role === l.role) last.parts.push(l.text);
    else turns.push({ role: l.role, parts: [l.text] });
  }
  const html = turns
    .map((t) => {
      const said = t.parts.map((p) => (p.startsWith("\u0000") ? `<span class="partial">${esc(p.slice(1))}</span>` : esc(p))).join(" ");
      return `<div class="turn ${t.role}"><div class="who">${SPEAKER[t.role] ?? t.role}</div><div class="said">${said}</div></div>`;
    })
    .join("");
  const box = $("transcript");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = html || '<p class="empty">Waiting for the conversation…</p>';
  if (atBottom || viewingId === liveId) box.scrollTop = box.scrollHeight;
}

function renderSms(sms: View["sms"]) {
  $("sms").innerHTML = sms.length
    ? sms
        .map((m) => {
          const body = esc(m.body).replace(/\b(\d{6})\b/, '<span class="code">$1</span>');
          return `<div class="time">${clock(m.ts)}</div><div class="bubble">${body}</div>`;
        })
        .join("")
    : '<div class="none">No messages</div>';
  $("sms").scrollTop = $("sms").scrollHeight;
}

function render(v: View) {
  lastEvents = v.events;
  renderTranscript(v.events);
  renderSms(v.sms);
  const { debtor: _d, claim: _c, ...rest } = v.session;
  $("session").textContent = JSON.stringify(rest, null, 2);
  $("events").innerHTML = v.events
    .filter((e) => e.type !== "transcript")
    .map((e) => {
      const bad = e.type === "tool_rejected" || (e.type === "plan_proposed" && !e.payload.approved) || e.type === "otp_failed";
      const detail = e.type === "tool_called" ? `${e.payload.tool} ${JSON.stringify(e.payload.args)}` : JSON.stringify(e.payload).slice(0, 140);
      return `<div class="ev${bad ? " bad" : ""}"><code>${e.type}</code> ${esc(detail)}</div>`;
    })
    .join("");
  $("tickets").textContent = v.tickets.length ? JSON.stringify(v.tickets, null, 2) : "None";
  $("ticket-count").textContent = v.tickets.length ? `(${v.tickets.length})` : "";
}

// Poll the session on screen so tool calls, SMS and tickets appear live.
async function poll() {
  if (viewingId && viewingId === liveId && inCall) await load(viewingId);
  setTimeout(poll, 1000);
}

// Status-bar clock like iOS: "8:11", no AM/PM.
const tickClock = () => ($("clock").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, ""));
setInterval(tickClock, 10_000);
tickClock();
$("sms").innerHTML = '<div class="none">No messages</div>';
void init();
void refreshHistory();
void poll();
