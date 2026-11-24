// Creates or updates the Vapi assistant from agent/assistant.ts.
//   npm run vapi:sync
// Needs VAPI_PRIVATE_KEY and PUBLIC_WEBHOOK_URL (a tunnel to this backend).
// On first run it appends VAPI_ASSISTANT_ID to .env.

import { appendFileSync } from "node:fs";
import { assistantConfig } from "./assistant.js";

try { process.loadEnvFile(".env"); } catch { /* use the environment */ }

const key = process.env.VAPI_PRIVATE_KEY;
const serverUrl = process.env.PUBLIC_WEBHOOK_URL;
const model = process.env.VAPI_MODEL ?? "claude-sonnet-5";
if (!key) throw new Error("VAPI_PRIVATE_KEY is not set");
if (!serverUrl) throw new Error("PUBLIC_WEBHOOK_URL is not set (start a tunnel to the backend first)");

const id = process.env.VAPI_ASSISTANT_ID;
const config = assistantConfig({ serverUrl, model, secret: process.env.VAPI_WEBHOOK_SECRET });
const res = await fetch(`https://api.vapi.ai/assistant${id ? `/${id}` : ""}`, {
  method: id ? "PATCH" : "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify(config),
});
const body = (await res.json()) as { id?: string; message?: unknown };
if (!res.ok) {
  console.error(`Vapi ${res.status}:`, JSON.stringify(body, null, 2));
  process.exit(1);
}
console.log(`${id ? "Updated" : "Created"} assistant ${body.id} (model ${model}, webhook ${config.server.url})`);
if (!id && body.id) {
  appendFileSync(".env", `\nVAPI_ASSISTANT_ID=${body.id}\n`);
  console.log("Saved VAPI_ASSISTANT_ID to .env");
}
