import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("api", () => {
  it("responds on /health", async () => {
    const res = await createApp().request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
