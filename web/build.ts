// Bundles the browser UI with esbuild so one `npm run dev` serves everything.
import { build } from "esbuild";

export async function buildWeb() {
  await build({
    entryPoints: ["web/src/main.ts"],
    bundle: true,
    format: "esm",
    outfile: "web/dist/main.js",
    sourcemap: true,
    logLevel: "warning",
  });
}
