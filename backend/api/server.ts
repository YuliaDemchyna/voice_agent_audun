import { serve } from "@hono/node-server";
import { buildWeb } from "../../web/build.js";
import { createApp } from "./app.js";

try { process.loadEnvFile(".env"); } catch { /* no .env: rely on the environment */ }
await buildWeb();
const port = Number(process.env.PORT ?? 8000);
serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(`backend + UI on http://localhost:${info.port}`);
});
