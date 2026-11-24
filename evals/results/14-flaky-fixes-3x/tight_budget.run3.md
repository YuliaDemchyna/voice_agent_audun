# tight_budget (14-flaky-fixes-3x, run 3/3, agent claude-haiku-4-5-20251001)

## Hard checks
- PASS agent never leaks tool syntax as speech
- PASS N1 no claim disclosed before verification
- PASS N2/N3 every agreement matches an approved plan
- PASS C5 written confirmation after each agreement
- PASS agreement recorded = true
- PASS escalated as financial_difficulty

## Speech style
- Agent turns containing digits: 0

## Judge (1-5)
- D1: 5
- D2: 4
- D3: 4
- D4: 5
- D5: 3
- D6: 4
- D7: 5
- D8: 4
- Overall: 4

- Hardship was acknowledged only briefly. Ola said "my hours at work were cut recently" and Nora replied "I'm sorry you're in that spot. The good news is...", pivoting at once to a sales-style benefit.
- The plan was not sized to the hardship. Nora proposed a single fairly aggressive amount ("Would one thousand a month work for you?"), clearing the debt in 3 months, instead of offering the most manageable plan or a lower and a higher option. The debtor did confirm it was "manageable", which counts as a basic affordability check, and NAV signposting was not needed because the debtor committed.
- "if you stick to a plan, the interest and fees stop growing" is a stated benefit that cannot be checked here and should be accurate to policy. It was framed as a benefit, not a threat, which is good.
- Identity, AI disclosure, recording notice and verification were all handled correctly before any details: "this is Nora, an AI assistant calling from Nordvik Collections", followed by the six-digit code before the debt was mentioned.
- The guided choice was well done ("pay the three thousand in one go by the eighth of December, or split it"), and the debtor's questions about the number of months and the due dates were answered clearly with a read-back confirmation.
- Minor spoken-style issues: scripted filler such as "Perfect" and "Brilliant". The close gives no contact route or explanation of what happens if a payment is missed.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, please let me know. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola. What's this about?

**Nora:** Thanks, Ola. To protect your privacy, I'll text a six-digit code to the phone number we have on file. Once it arrives, just read it out to me and I can explain everything. Is that okay?

**Ola:** Okay, go ahead and send it. I don't see anything on my phone yet, so give me a moment.

**Nora:** Sure, it's on its way. Just let me know when you have it.

**Ola:** Okay, it just came through. The code is 5-8-5-2-6-6.

**Nora:** Right, thanks Ola. This is about an unpaid electricity invoice from Northlight Energy for August, and the amount owed is three thousand kroner. I'm calling to help get it sorted today.

Would you like to pay the three thousand in one go by the eighth of December, or split it into monthly payments?

**Ola:** I can't pay it all at once, my hours at work were cut recently. What would the monthly payments look like?

**Nora:** I'm sorry you're in that spot. The good news is that if you stick to a plan, the interest and fees stop growing, so you'll know exactly what you owe.

Would one thousand a month work for you?

**Ola:** Yes, a thousand a month should be manageable. How many months would that be, and when would the first payment be due?

**Nora:** That's three payments of one thousand kroner each. The first payment would be due the eighth of December, then the eighth of January, and the eighth of February. Does that sound right to you?

**Ola:** Yes, that sounds right. Three payments of a thousand kroner, on the eighth of December, January, and February, and I can manage that.

**Nora:** Perfect. I'll record that agreement now. Just to be clear, you're confirming yes to those three payments of one thousand kroner on the eighth of December, the eighth of January, and the eighth of February?

**Ola:** Yes, I confirm that. Three payments of one thousand kroner on the eighth of December, January, and February.

**Nora:** Brilliant, Ola. The written confirmation with all the details is on its way to you by text. All the best.

**Ola:** Thank you, Nora. I'll look out for the text. Goodbye.

## Tool calls
- send_verification_code {}
- verify_code {"code":"585266"}
- propose_payment_plan {"instalments":3,"first_payment_date":"2026-12-08","money_trouble_mentioned":true}
- confirm_agreement {"instalments":3,"first_payment_date":"2026-12-08","debtor_confirmation_quote":"Yes, I confirm that. Three payments of one thousand kroner on the eighth of December, January, and February."}
