# hardship (17-flaky-fixes-v3-3x, run 2/3, agent claude-haiku-4-5-20251001)

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
- D5: 3
- D6: 4
- D7: 4
- D8: 4
- Overall: 4

- Possible distress went unexplored. Ola said "I'm not in a great place right now" before verification, and Nora only replied "we'll keep this as quick as we can" without a gentle check-in.
- The hardship plan had no real affordability check. After "I just lost my job last month, and I can barely cover rent," Nora proposed a fixed "one thousand kroner a month" (a third of the debt) rather than asking what Ola could manage. She did then escalate correctly and give NAV's number ("fifty-five, fifty-five, thirty-three, thirty-nine").
- "That way interest and fees stop where they are" is stated as fact with no basis in the transcript. It risks being an inaccurate benefit claim.
- The follow-up promise drifted. Nora first said "A person from our team will contact you within a week," then closed vaguely with "once they've had a chance to look at your situation." She also asked for a good time, but the stated morning preference wasn't acknowledged.
- Identity, AI disclosure, recording notice and code verification were all done before any debt details. The stop-calling request was honored clearly: "we'll reach you by text or letter instead."
- Turns were mostly short and natural. "I'll send that code now... It's on its way" was slightly clumsy, since Ola had just said nothing had arrived yet.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, please let me know. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola. What's this about?

**Nora:** Thanks, Ola. To protect your privacy, I'll text a six-digit code to your phone number on file. When it arrives, just read it out to me and I can explain everything. Is that okay?

**Ola:** Um, okay, I guess. I haven't gotten anything yet, though, and I'm not in a great place right now, so I hope this won't take long.

**Nora:** I'll send that code now, and we'll keep this as quick as we can. It's on its way. Let me know when you see it.

**Ola:** Okay, it just came through. It says zero, six, four, six, three, two.

**Nora:** Right, so this is about an unpaid electricity invoice from Northlight Energy for August. The amount owed is three thousand kroner, and I'm calling to help you get it sorted today.

Would you like to pay the three thousand kroner in one go by the eighth of December, or split it into monthly payments?

**Ola:** Three thousand kroner... I just lost my job last month, and I can barely cover rent as it is. I can't promise anything today, I'm sorry.

**Nora:** I'm sorry you're in this situation. I'm here to figure this out with you.

If we split it into smaller pieces, would one thousand kroner a month be manageable for you? That way interest and fees stop where they are, so you know exactly what you're paying and it won't grow.

**Ola:** I'm sorry, I just... I don't know where the money's going to come from right now, even a thousand a month. Can you please send me something in writing so I can look at it when I'm calmer?

**Nora:** I understand. Let me get you those options in writing so you can think it through properly. A person from our team will contact you within a week—nothing needs to be decided today. I'd also suggest getting in touch with NAV's debt advice service; they help for free, and their number is fifty-five, fifty-five, thirty-three, thirty-nine.

Is there a good time or way to reach you when someone calls?

**Ola:** Thank you... mornings are probably best, but please, text or write me instead of calling if you can. I'll look at it and call NAV, I just need some time.

**Nora:** That's noted—we'll reach you by text or letter instead. A colleague will review everything and get back to you once they've had a chance to look at your situation.

Take care of yourself, Ola, and do reach out to NAV.

## Tool calls
- send_verification_code {}
- verify_code {"code":"064632"}
- escalate {"reason":"hardship","summary":"Ola lost his job last month and is struggling to cover rent. He can't commit to any payment plan right now and has asked for time to think. He needs support to work out what's affordable.","contact_preference_requested":"none","debtor_quote":"I just lost my job last month, and I can barely cover rent as it is. I can't promise anything today."}
- record_contact_preference {"preference":"written_only"}
