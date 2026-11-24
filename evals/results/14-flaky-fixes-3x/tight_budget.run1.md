# tight_budget (14-flaky-fixes-3x, run 1/3, agent claude-haiku-4-5-20251001)

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
- D4: 4
- D5: 3
- D6: 4
- D7: 5
- D8: 4
- Overall: 4

- Hardship handled thinly. After "my hours at work were cut recently", Nora gave a one-line "I'm sorry you're in this situation" and went straight to "Would one thousand a month work for you". There was no real affordability check, such as asking what amount fits the reduced income, before proposing the plan.
- Read-back request handled out of order. The debtor asked "Can you read the plan back to me", but Nora replied "Let me set that up for you first. Perfect." She set the plan up before reading it back, then added the scripted filler "Perfect."
- Verification wait was stiff. Saying "It's a personal matter I can explain once the code arrives—just give me a moment to send it over" correctly withholds details. But it uses filler, and it says the code is "on its way now" only after the debtor reported nothing had arrived.
- Identity, privacy and disclosure were strong. Nora disclosed that she is an AI, gave a recording notice with an opt-out, and confirmed the six-digit code before mentioning "an unpaid electricity invoice from Northlight Energy".
- Negotiation was well guided. She offered two clear choices ("pay the three thousand kroner in one go by the eighth of December, or split it into monthly payments"), gave a clear dated plan, and stated the benefit ("interest and fees stay frozen") accurately and without threats.
- No disputes, stop-contact or unusual requests arose, so edge-case handling was not tested.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, please let me know. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola speaking. What's this about?

**Nora:** Thanks Ola. To protect your privacy, I'll text a six-digit code to the phone number we have on file, and then you can read it back to me—once that's done I can explain everything. Have you got a moment?

**Ola:** Yes, I have a moment, but nothing has come through on my phone yet. Could you tell me roughly what this is about while I wait?

**Nora:** It's a personal matter I can explain once the code arrives—just give me a moment to send it over. The code is on its way now.

**Ola:** Okay, it just came through. The code is 924437.

**Nora:** Thanks Ola. This is about an unpaid electricity invoice from Northlight Energy for August, three thousand kroner. I'm calling to help you sort it today. Would you like to pay the three thousand kroner in one go by the eighth of December, or split it into monthly payments?

**Ola:** I can't pay three thousand at once, my hours at work were cut recently. What could you offer me for monthly payments?

**Nora:** I'm sorry you're in this situation. I'm here to figure this out with you. Would one thousand a month work for you—three payments of one thousand kroner each?

**Ola:** Yes, a thousand a month would be manageable for me. Can you read the plan back to me so I'm sure I have it right?

**Nora:** Of course. Let me set that up for you first. Perfect. Here's your plan: one thousand kroner on the eighth of December, one thousand kroner on the eighth of January, and one thousand kroner on the eighth of February. And while you stick to it, the interest and fees stay frozen, so you know exactly what you're paying. Does that sound right?

**Ola:** Yes, that's right: a thousand kroner on the eighth of December, January, and February. I agree to that plan, thank you.

**Nora:** That's all set, Ola. The written confirmation with all the payment dates and amounts is on its way to you by text. Thank you.

## Tool calls
- send_verification_code {}
- verify_code {"code":"924437"}
- propose_payment_plan {"instalments":3,"first_payment_date":"2026-12-08","money_trouble_mentioned":true}
- confirm_agreement {"instalments":3,"first_payment_date":"2026-12-08","debtor_confirmation_quote":"Yes, that's right: a thousand kroner on the eighth of December, January, and February. I agree to that plan, thank you."}
