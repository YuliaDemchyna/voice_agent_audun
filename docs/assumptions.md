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
| A8 | **Drafting order.** product.md, journey.md and escalation.md were drafted while the research agents were still running. rulebook.md was written after the law research. All four were reconciled with the research afterwards in one commit ("reconcile Phase 1 docs with research"). | Time budget: drafting and researching in parallel saved time | n/a. This records how the docs were made. |
| A9 | Reviewer deadlines marked *target* in escalation.md (crisis immediately, hardship within 1 business day) are our own goals. The only legal deadline we found is a reply to debtor inquiries within 1 week (new act § 17). | No source sets internal escalation turnaround times | Audun has its own operational targets |
| A10 | The crisis-line number (Mental Helse, 116 123) has not been verified. | Taken from general knowledge, not from the research | Check before any real use |
| A11 | **14-day rule (decided 2026-11-24).** "First payment within 14 days" means the first or only payment is due within 14 calendar days of the agreement date (the call is day 0). This applies to full payment too. One full payment later than that is a deferral and goes to human review. | The brief offers "pay now, or pay in pieces starting now", not "pay everything later" | Audun's policy allows deferrals |
