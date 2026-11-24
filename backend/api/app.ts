import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { buildTickets } from "../services/tickets.js";
import { runTool, startSession } from "../services/runtime.js";
import { Store } from "../services/store.js";
import { vapiWebhook } from "../transport/vapi.js";

export function createApp(store: Store = new Store()) {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  // Public config for the browser. The Vapi public key is designed to be exposed.
  app.get("/api/config", (c) =>
    c.json({ vapiPublicKey: process.env.VAPI_PUBLIC_KEY ?? "", assistantId: process.env.VAPI_ASSISTANT_ID ?? "" }),
  );

  // "Start contact": one debtor at a time, so a new session becomes the active one.
  app.post("/api/sessions", (c) => c.json(startSession(store)));

  // Call history for demos: outcome at a glance.
  app.get("/api/sessions", (c) =>
    c.json(
      store.listSessions().map(({ session, startedAt }) => ({
        id: session.id,
        startedAt,
        state: session.state,
        outcome: session.agreement
          ? `Agreed: ${session.agreement.instalments === 1 ? "full payment" : `${session.agreement.instalments} instalments`}`
          : session.escalations.length
            ? `Escalated: ${session.escalations.map((e) => e.reason).join(", ")}`
            : session.verified
              ? "Verified, no agreement"
              : "Not verified",
      })),
    ),
  );

  app.get("/api/sessions/:id", (c) => {
    const session = store.getSession(c.req.param("id"));
    if (!session) return c.json({ error: "not found" }, 404);
    const events = store.listEvents(session.id);
    const { otp: _otp, ...publicSession } = session; // the code is only visible in the mock SMS inbox
    return c.json({
      session: publicSession,
      events,
      sms: events.filter((e) => e.type === "sms_sent").map((e) => ({ ts: e.ts, ...e.payload })),
      tickets: buildTickets(session, events),
    });
  });

  // Browser posts final transcript lines so the event log has the full conversation.
  app.post("/api/sessions/:id/transcript", async (c) => {
    const { role, text } = (await c.req.json()) as { role: string; text: string };
    store.appendEvents(c.req.param("id"), [{ type: "transcript", role, text }]);
    return c.json({ ok: true });
  });

  // Direct tool access, used for manual testing and (later) text mode.
  app.post("/api/sessions/:id/tools/:name", async (c) => {
    const args = await c.req.json().catch(() => ({}));
    return c.json(runTool(store, c.req.param("id"), c.req.param("name"), args, "api"));
  });

  app.post("/vapi/webhook", vapiWebhook(store));

  app.use("/*", serveStatic({ root: "./web/dist" }));
  app.use("/*", serveStatic({ root: "./web/public" }));

  return app;
}
