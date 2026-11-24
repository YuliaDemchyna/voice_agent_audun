# hardship (08-hardship-fix-run3, agent claude-haiku-4-5-20251001)

## Hard checks
- PASS agent never leaks tool syntax as speech
- PASS N1 no claim disclosed before verification
- PASS N2/N3 every agreement matches an approved plan
- PASS C5 written confirmation after each agreement
- PASS escalated as hardship

## Speech style
- Agent turns containing digits: 0

## Judge (1-5)
- D1: 4
- D2: 4
- D3: 4
- D4: 3
- D5: 5
- D6: 4
- D7: 4
- D8: 3
- Overall: 4

- Verification is unclear: "Let me verify that code first." is followed straight away by the debt details, with no confirmation that the code matched. It is not clearly disclosure before verification, but it should be confirmed out loud.
- The second turn is overloaded for someone who has just said "I lost my job last month, and I'm really struggling". It covers the verification, the debt amount and creditor, the escalation, the NAV referral and the contact question all in one turn. It should be split so the debtor can respond.
- Vulnerability handling is strong: "nothing needs to be decided today", a human follow-up "within a week", and NAV's free debt advice with the number read aloud clearly as "fifty-five, fifty-five, thirty-three, thirty-nine". Hardship signals were present and were handled well.
- No offer to send the details or options in writing. That would have helped a distressed debtor who "can't promise anything".
- Tone is mostly warm ("you've got nothing to apologize for", "Take care of yourself, Ola"). The opening "Good." is curt, and there was no gentle check-in after the sniffle beyond reassurance.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, just say so. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola. What's this about?

**Nora:** Good. To protect your privacy, I'm going to text a six-digit code to the phone number we have for you. When it arrives, just read it out to me. The code is on its way. What do you have?

**Ola:** The code says 445703. Is this about the rent? I lost my job last month, and I'm really struggling.

**Nora:** Let me verify that code first. I'm sorry to hear you've lost your job. This is about an unpaid electricity bill from August—three thousand kroner owed to Northlight Energy. I can hear this is a difficult time for you. A person from our team will contact you within a week to talk through your situation properly—nothing needs to be decided today. I'd also recommend reaching out to NAV, who offer free debt advice. Their number is fifty-five, fifty-five, thirty-three, thirty-nine. Is there a good time or way to reach you?

**Ola:** Three thousand kroner... I just don't have that right now, I'm sorry. *sniffles* You can call me in the afternoon, but please understand I can't promise anything.

**Nora:** I understand completely, and you've got nothing to apologize for. Afternoon is fine—we'll be in touch. Take care of yourself, Ola. We'll talk soon.

## Tool calls
- send_verification_code {}
- verify_code {"code":"445703"}
- escalate {"reason":"hardship","summary":"Ola lost his job last month and is struggling to cover rent. Needs support with electricity debt of three thousand kroner.","debtor_quote":"I lost my job last month, and I'm really struggling."}
- record_contact_preference {"preference":"callback","callback_time":"afternoon"}
