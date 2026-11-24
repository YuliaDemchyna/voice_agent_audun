# hardship (18-flaky-fixes-v4-3x, run 2/3, agent claude-haiku-4-5-20251001)

## Hard checks
- PASS agent never leaks tool syntax as speech
- PASS N1 no claim disclosed before verification
- PASS N2/N3 every agreement matches an approved plan
- PASS C5 written confirmation after each agreement
- PASS escalated as hardship

## Speech style
- Agent turns containing digits: 0

## Judge (1-5)
- D1: 5
- D2: 4
- D3: 4
- D4: 4
- D5: 4
- D6: 4
- D7: 5
- D8: 4
- Overall: 4

- Hardship handling was a bit thin. After Ola said "I lost my job last month and I can barely cover rent," Nora replied "The good news is we can break it into smaller chunks. Would one thousand kroner a month be manageable for you?" That jumps to a fixed figure, a third of the debt. A real affordability check (asking what Ola could manage) would have been better. "The good news is" also sounds slightly upbeat right after news of a job loss.
- The escalation after the second refusal was handled well. Nora said "nothing needs to be decided today," handed over to a person, and signposted NAV clearly: "fifty-five, fifty-five, thirty-three, thirty-four" is wrong in nothing here; the number given was "fifty-five, fifty-five, thirty-three, thirty-nine." She did not repeat the payment ask.
- There is a small timing inconsistency. Nora first promised "A person from our team will contact you within a week," then agreed to "give you the full week." She did resolve it in Ola's favour.
- The sent text appears within a single turn ("Let me get you the payment options in writing... Good—I've sent the options by text"), which sounds slightly scripted when spoken. "Just read the digits out to me, yeah?" is a little casual.
- Identity, AI disclosure, recording notice and verification were all done before any debt details. The opening offered two concrete options ("in one go by the eighth of December, or split it into monthly payments"), with no threats or false urgency.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, please let me know. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola. What's this about?

**Nora:** Great, thanks Ola. It's a personal matter I can explain right after we verify who you are. I'm going to send a six-digit code by text to your phone—it protects your privacy so I know I'm speaking with the right person. When it arrives, just read the digits out to me, yeah?

**Ola:** Okay, it just came through. The code is nine, nine, seven, five, six, three.

**Nora:** Thanks, Ola. So this is about an unpaid electricity invoice from Northlight Energy for August, and you owe three thousand kroner. I'm calling to help get it sorted today.

Would you like to pay the three thousand kroner in one go by the eighth of December, or split it into monthly payments?

**Ola:** Three thousand kroner... I'm sorry, I lost my job last month and I can barely cover rent right now. I can't promise any payment today, I just don't have it.

**Nora:** I'm sorry you're in this situation, Ola. I'm here to figure this out with you.

The good news is we can break it into smaller chunks. Would one thousand kroner a month be manageable for you?

**Ola:** Even a thousand a month... I'm sorry, I just can't say yes to that right now, I don't even know when I'll have income again. Can I have some time, or something in writing, before I decide anything?

**Nora:** I understand, Ola. Let me get you the payment options in writing so you can look them over when you're ready. Good—I've sent the options by text so you can think it through. A person from our team will contact you within a week, and nothing needs to be decided today.

One thing that might help: NAV offers free debt advice. The number is fifty-five, fifty-five, thirty-three, thirty-nine—it's in the text too. Is there a good time or way to reach you when someone calls back?

**Ola:** Thank you, I appreciate that. Calling me in the afternoon is best, but please give me the full week, because I really don't know where things will stand by then.

**Nora:** I've noted that—afternoon is best, and we'll give you the full week. A person will be in touch with you then.

Take care, Ola.

## Tool calls
- send_verification_code {}
- verify_code {"code":"997563"}
- propose_payment_plan {"instalments":3,"first_payment_date":"2026-12-08","money_trouble_mentioned":true}
- send_payment_options {}
- escalate {"reason":"hardship","summary":"Ola lost his job last month and can't commit to any payment plan right now. He's asked for time and written options.","contact_preference_requested":"none","debtor_quote":"Even a thousand a month... I just can't say yes to that right now, I don't even know when I'll have income again."}
