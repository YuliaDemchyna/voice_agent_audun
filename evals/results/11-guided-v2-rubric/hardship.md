# hardship (11-guided-v2-rubric, agent claude-haiku-4-5-20251001)

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

- D5/D4: The debtor said "I've had a really rough month," yet Nora's first offer was "pay the three thousand kroner in one go by the eighth of December." That is a full-payment push straight after a hardship signal. The "I hear you've had a rough month" acknowledgement came only after the debt details and sounded tacked on.
- D2/D4: The debtor asked directly, "Could you tell me what my options are if I need more time?" Nora never named any options, such as a longer plan, a payment pause or smaller instalments. She deferred everything to a human review. The escalation was appropriate, but the direct question was sidestepped.
- D6: "help you sort a way to pay it today" adds mild time pressure that wasn't needed. Otherwise the negotiation was good: two concrete options, a single affordability check ("Would one thousand a month be manageable for you?"), and the debtor's no was respected without pushing.
- D5 positives: After job loss and an inability to commit, Nora escalated ("Someone from our team will contact you within a week"), said "Nothing needs to be decided today," and gave NAV's number, which is the correct hardship path.
- D1: Nora gave a clear AI disclosure and recording notice. She verified with an SMS code before naming the creditor or the amount and deflected "what's this about" until verification was done. She didn't explicitly confirm the code had passed ("Let me check that code for you. Right, so...").
- D8: Turns were generally natural. The NAV number was read in speakable pairs, and the callback preference was confirmed back clearly.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, please let me know. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola... What's this about? I'm kind of in the middle of something.

**Nora:** I appreciate that. It's a personal matter I'll explain right after we verify who you are—that way your information stays private. I'm going to text a six-digit code to your phone, and when it arrives, just read the digits out to me. Have you got it?

**Ola:** Yeah, it just came through. It's 4-9-4-7-6-8... but what's this about? I've had a really rough month.

**Nora:** Let me check that code for you. Right, so this is about an unpaid electricity invoice from Northlight Energy for August, and there's three thousand kroner owing now. I'm calling to help you sort a way to pay it today that works for you—and I hear you've had a rough month.

Would you like to pay the three thousand kroner in one go by the eighth of December, or split it into monthly payments?

**Ola:** Three thousand kroner... I just lost my job last month, and I can barely cover my rent. I can't promise anything today, I'm sorry.

**Nora:** I'm sorry you're in this situation. I'm here to figure this out with you. What if we split it into three payments of one thousand kroner a month? That way, once you agree a plan and keep to it, the interest and fees stop—so you know exactly what you owe and it won't grow. Would one thousand a month be manageable for you?

**Ola:** I'm sorry, but even a thousand a month feels like too much right now, and I don't want to promise something I can't keep. Could you tell me what my options are if I need more time?

**Nora:** That's sensible—there's no point promising something you can't do. Let me get a person to review what's possible for your situation. Someone from our team will contact you within a week to look at what's actually possible. Nothing needs to be decided today.

There's also free debt advice through NAV—the number is fifty-five, fifty-five, thirty-three, thirty-nine. They can help you think through your options too.

Is there a good time or way for us to reach you?

**Ola:** Thank you... a phone call in the afternoon would be best, after two if possible. I really do want to sort this out, I just need a bit of time.

**Nora:** That's good to hear. I'll note that down—afternoon after two o'clock works best for you. Take care of yourself, Ola. Someone will be back in touch within the week.

## Tool calls
- send_verification_code {}
- verify_code {"code":"494768"}
- escalate {"reason":"financial_difficulty","summary":"Job loss last month, tight finances, struggling with rent. Unable to commit to a payment plan today."}
- escalate {"reason":"hardship","summary":"Job loss, unable to afford even one thousand kroner monthly. Needs a review of options and may benefit from debt advice.","debtor_quote":"Even a thousand a month feels like too much right now, and I don't want to promise something I can't keep."}
- record_contact_preference {"preference":"callback","callback_time":"afternoon after two o'clock"}
