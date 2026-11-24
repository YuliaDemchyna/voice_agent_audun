import { describe, expect, it } from "vitest";
import { Store } from "../services/store.js";
import { createApp } from "./app.js";

describe("api", () => {
  it("responds on /health", async () => {
    const res = await createApp(new Store(":memory:")).request("/health");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("runs the happy path through the Vapi webhook and never exposes the code", async () => {
    const store = new Store(":memory:");
    const app = createApp(store);
    const session = (await (await app.request("/api/sessions", { method: "POST" })).json()) as { id: string };

    const call = async (name: string, args: unknown = {}) => {
      const res = await app.request("/vapi/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: { type: "tool-calls", toolCallList: [{ id: `tc_${name}`, function: { name, arguments: args } }] } }),
      });
      const body = (await res.json()) as { results: Array<{ toolCallId: string; result: string }> };
      return JSON.parse(body.results[0]!.result) as Record<string, unknown>;
    };

    expect((await call("get_claim_details")).ok).toBe(false);
    expect(JSON.stringify(await call("send_verification_code"))).not.toMatch(/\d{6}/);
    const view = (await (await app.request(`/api/sessions/${session.id}`)).json()) as { sms: Array<{ body: string }>; session: Record<string, unknown> };
    expect(view.session.otp).toBeUndefined();
    const code = view.sms[0]!.body.match(/\d{6}/)![0];
    expect((await call("verify_code", { code })).ok).toBe(true);
    const details = (await call("get_claim_details")) as { latest_first_payment_date: string };
    expect((await call("propose_payment_plan", { instalments: 3, first_payment_date: details.latest_first_payment_date })).approved).toBe(true);
    expect((await call("confirm_agreement", { instalments: 3, first_payment_date: details.latest_first_payment_date, debtor_confirmation_quote: "Yes" })).ok).toBe(true);

    const final = (await (await app.request(`/api/sessions/${session.id}`)).json()) as { session: { state: string }; sms: Array<{ purpose: string }> };
    expect(final.session.state).toBe("agreed");
    expect(final.sms.map((s) => s.purpose)).toEqual(["otp", "agreement_confirmation"]);
  });
});
