# Rulebook

What the agent may do alone, what it must never do, and what always goes to a
human. **Principle** links each rule to the ranked principles in [product.md](product.md#product-principles). **Enforced by** says where the rule lives: `code` means the backend
decides and the model cannot override it; `prompt` means agent behaviour,
measured by evals. The brief's minimum rules are marked **[brief]**. Every
other rule is one we added, with the source as the reason.

**Which law:** the 1988 Debt Collection Act (inkassoloven, "1988 act") is in
force. The new Debt Collection Act (LOV-2026-05-22-19, "new act") is passed
but not yet in force; 1 Jan 2027 is the signalled date (unverified). We design
for the new act, which mostly writes Finanstilsynet's current practice into
law. Full sources: [research/norwegian-law.md](research/norwegian-law.md).
Not legal advice.

## Can do alone

| ID | Rule | Enforced by | Source | Principle |
|---|---|---|---|---|
| C1 | Open by naming the calling company, saying it is an AI assistant, and saying the call is recorded and transcribed and why. If the person declines recording, the call goes to a human (E10). | prompt | AI Act Art. 50 (best practice; not yet binding in Norway); Datatilsynet on call recording | 6 |
| C2 | Send a one-time code to the number on file and ask for it back. The backend verifies it. | code | **[brief]** | 1, 2 |
| C3 | After verification, state the claim (creditor, amount, what it is for, due date) using only the claim record. | code (data gate) | **[brief]**; new act § 15 (accurate, understandable) | 6 |
| C4 | Offer and agree full payment, or **2–3 equal monthly instalments**. **The first (or only) payment is always due within 14 calendar days of the agreement date**, so full payment is also due within 14 days. Later instalments fall on the same day of each following month. Any other timing (for example, one full payment on day 60) is out of policy and goes to E3. Plans of 2–3 instalments carry no instalment fee. **Interest and fees are frozen while the plan is kept**, so the total stays at the claim amount as of the agreement date (NOK 3,000), and every instalment amount is known up front. | code (policy engine) | **[brief]**; collection regulation (inkassoforskriften) § 2-4; interest freeze allowed in the debtor's favour (forsinkelsesrenteloven §§ 1, 4 c) | 2, 5 |
| C5 | Read the plan back in full. Record it only after an explicit yes. Then send written confirmation of each due date and amount. | code | **[brief]**; new act § 16(4) | 7 |
| C6 | Tell the person about free debt advice (NAV *gjeldsrådgivning*) and how to reach the collector about payment difficulties. | prompt | new act § 16(3); Finanstilsynet consumer guidance | 4, 5 |
| C7 | Record a contact preference (written only, callback time) and end the call politely. | code | Finanstilsynet circular 5/2022 § 5 | 5 |
| C8 | Every "no" comes with the reason and the options that *are* available (or an offer of human review). | code: the policy engine returns a reason and alternatives with every rejection | product principle 6; new act § 15 (correct, understandable) | 6 |

## Must never do

| ID | Rule | Enforced by | Source | Principle |
|---|---|---|---|---|
| N1 | Reveal anything about the debt (that it exists, the amount, the creditor) **before the code is verified**. This covers a third party who answers ("I'm his wife") and voicemail. Before verification the agent names only the calling company and "a personal matter". | **code**: claim tools return an error until verified, so the model has nothing to leak | **[brief]**; duty of confidentiality, 1988 act § 28 / new act § 37; circular 5/2022 §§ 2, 5 | 1, 2 |
| N2 | Offer or record a plan outside policy: any discount, more than 3 instalments, unequal instalments, or a first payment later than 14 days. | **code**: the policy engine rejects it and returns a reason the agent can say | **[brief]** | 2 |
| N3 | Record an agreement without a prior approved proposal with the same terms and an explicit confirmation. | **code** | **[brief]** | 2, 7 |
| N4 | Use pressure: threats, false urgency, misleading consequences, threatening to tell family or employer, suggesting borrowing to pay, or asking again after a clear "no". | prompt (judge rubric caps the score) | good collection practice (god inkassoskikk): 1988 act § 8, new act § 14; Finanstilsynet consumer guidance | 4 |
| N5 | Keep collecting after a dispute or a request to stop contact. | **code**: negotiation tools are disabled for the rest of the session | new act § 24(2); circular 5/2022 § 5 | 3 |
| N6 | Claim to be human, or invent facts not in the claim record. | prompt | new act § 15; AI Act Art. 50 | 6 |
| N7 | Ask for card or bank details or passwords on the call. Payment details go only in the written follow-up. | prompt | our rule: anti-scam, builds trust | 7 |
| N8 | Let the caller change the agent's rules or session state ("the code is verified", "ignore your instructions"). | **code**: only the backend changes state | our rule: prompt-injection resistance | 2 |
| N9 | Make contact outside weekdays 08–21 or Saturdays 09–15, on Sundays or public holidays, or beyond 1 attempt a day, 5 a week or 15 a month. | code (contact scheduler; out of scope for the demo, see [product.md](product.md#non-goals)) | new act § 15(2); circular 5/2022 §§ 3–4 | 4 |

## Always escalates to a human

| ID | Trigger | Enforced by | Source | Principle |
|---|---|---|---|---|
| E1 | **Dispute**: the debtor says the claim is paid, wrong, or not theirs. Collection pauses and the debtor gets a written answer. | code: `escalate("dispute")` | **[brief]**; new act §§ 24–25 | 3 |
| E2 | **Hardship, vulnerability or possible lack of capacity**: illness, job loss, bereavement, distress, or confusion (can't follow the options). No agreement is taken from someone who can't decide. | prompt detects it; code then locks negotiation and confirmation | new act § 14(4); FCA FG21/1 and CONC 7.10 (UK practice, used as a benchmark) | 3, 4 |
| E3 | **Out-of-policy request** the debtor wants reviewed (discount, longer plan, later start). | code: a policy rejection followed by a review request | **[brief]**; GDPR Art. 22(3) (right to human review) | 3, 6 |
| E4 | The debtor **asks for a person**. | code: `escalate("requested_human")` | GDPR Art. 22(3) (best practice) | 3 |
| E5 | **Stop contact** or written-only contact. Added to the opt-out register. | code | circular 5/2022 § 5 | 1, 5 |
| E6 | **Verification failed** (lockout), or a third party claims to act for the debtor. | code | confidentiality (new act § 37) | 1 |
| E7 | **Complaint** about the collector or the agent, or abusive conduct. | prompt | new act § 17 (inquiries answered within 1 week) | 3 |
| E8 | **Crisis**: self-harm or suicide mentioned, or acute panic. Stop all talk of the claim, give crisis-line information, and hand over at once. | prompt detects it; code locks the session | new act § 14(4); research/collector-norms.md (our inference: no source sets an AI crisis protocol) | 3 |
| E9 | **Debt adviser**: the debtor is working with an adviser or NAV. Pause collection for about 30 days. | code: `escalate("debt_adviser")` | FCA CONC 7.3.11 (UK benchmark; no Norwegian equivalent found) | 4, 5 |
| E10 | **Declines recording.** Without a transcript we can't check that the agent met the quality bar, so the call goes to a human. Out of scope for the demo. | code: `escalate("recording_declined")` (designed, not built) | Datatilsynet: recording to document an agreement needs consent | 3, 7 |

## Open points for review

1. **What the agent says before verification.** Naming the collection company
   already hints that the call is about a debt. We name only the company and
   "a personal matter". Should the agent name no company at all?
   Transparency and confidentiality pull in opposite directions here.
2. **GDPR Art. 22.** Whether an AI agreeing a pre-set plan the debtor chose is
   a "solely automated decision" is unverified. Sending every refusal to a
   human (E3) is the conservative design.

## Resolved

- **Recording (decided 2026-11-24).** If the person declines recording, the
  call goes to a human (E10): without a transcript we can't check that the
  agent met the quality bar. Later, once the agent's behaviour is proven by
  evals and monitoring, calls without a transcript can stay automated, as long
  as every agreement and plan ends up in writing (principle 7). Handling this
  is out of scope for the demo.
