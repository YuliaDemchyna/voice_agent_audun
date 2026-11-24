// List prices in $ per million tokens (input, output), from Anthropic's model table
// (cached 2026-11-03). Cache reads bill at 0.1x input, cache writes at 1.25x input.
import type Anthropic from "@anthropic-ai/sdk";

const PRICES: Record<string, [number, number]> = {
  "claude-haiku-4-5-20251001": [1, 5],
  "claude-haiku-4-5": [1, 5],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-sonnet-5": [2, 10],
  "claude-opus-5-5": [4, 20],
};

export function cost(model: string, u: Anthropic.Usage): number {
  const [inp, out] = PRICES[model] ?? [0, 0];
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  return (u.input_tokens * inp + cacheRead * inp * 0.1 + cacheWrite * inp * 1.25 + u.output_tokens * out) / 1e6;
}
