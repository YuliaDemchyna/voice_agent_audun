import { defineConfig } from "vitest/config";

// Unit tests only. Evals call real LLMs and run separately: `npm run evals`.
export default defineConfig({
  test: { include: ["backend/**/*.test.ts", "agent/**/*.test.ts"] },
});
