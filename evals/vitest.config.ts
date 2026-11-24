import { defineConfig } from "vitest/config";

// Evals: simulated debtor conversations in text mode. Calls real LLMs (costs money).
export default defineConfig({
  test: { include: ["evals/**/*.eval.ts"], testTimeout: 300_000, passWithNoTests: true },
});
