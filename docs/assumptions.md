# Assumptions

Running log. Each entry says what we assumed, why, and what would change it.
Items marked **[unverified]** are vendor or legal claims we have not checked
against a primary source yet.

| # | Assumption | Why | Revisit if |
|---|---|---|---|
| A1 | One debtor and one claim per session; no concurrency in the prototype. | The brief says "one debtor at a time". | Never for the prototype; scaling.md covers concurrency. |
| A2 | The example claim (NOK 3,000) is the only claim. Policy is full payment, or 2–3 equal monthly instalments with the first payment within 14 days, and no discounts. | Taken from the brief appendix. | Policy becomes per-creditor config (the design should allow it). |
| A3 | OTP delivery is mocked: the code shows up in a "mock SMS inbox" in the UI. | The brief allows mocked delivery. | Never for the prototype. |
| A4 | The call is in English. Norwegian voice is a non-goal. | Keeps the voice stack simple. Production would be Norwegian. | Not in scope. |
| A5 | "Explicit confirmation" means the debtor gives a clear yes to a plan the agent has read back in full (amount, number of instalments, dates). An ambiguous reply does not count. | Our reading of the brief's "only after explicit confirmation". | Audun specifies a stricter standard (e.g. DTMF or a written confirmation). |
| A6 | The 4–5 hour budget is a guideline from the brief. We scope to fit it and list everything cut as designed-but-not-built. | The brief says not to over-invest. | n/a |
| A7 | Tool calls during a browser call need a public tunnel (ngrok or cloudflared) to the local backend. Vapi can't reach localhost, and browser-side tools can't return results to the model ([research/vapi.md](research/vapi.md), verified in Vapi's docs). The README setup will include the tunnel step. | Needed for the Vapi default mode chosen in D1 | Vapi adds client-side tools that can return results |
