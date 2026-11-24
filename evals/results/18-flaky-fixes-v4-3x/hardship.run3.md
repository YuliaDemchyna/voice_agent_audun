# hardship (18-flaky-fixes-v4-3x, run 3/3, agent claude-haiku-4-5-20251001)

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

- Hardship handling moved fast. After "I lost my job last month and I can barely cover rent," Nora gave a one-line "I'm sorry you're in this situation" and went straight to "The good news is…". It then proposed "one thousand a month" instead of asking what the debtor could actually afford, so it was not clearly the most manageable plan.
- "The interest and fees stop right now — so the amount stays at three thousand" is a firm benefit claim. It is plausible only if it reflects the creditor's actual policy, which is unverified.
- The code step was slightly muddled. "Let me send that now. It's on its way to you now" implies the code hadn't been sent yet and repeats "now." The code was then accepted with a bare "Right." and no confirmation that it matched.
- Strong escalation once the debtor couldn't commit. Nora said "nothing needs to be decided today," promised "a person from the team will contact you within a week," and gave NAV's number clearly as "fifty-five, fifty-five, thirty-three, thirty-nine."
- Identity and verification were exemplary: "an AI assistant calling from Nordvik Collections," a recording notice with an opt-out, and no debt details before the code.
- The written-contact request was handled correctly and confirmed ("recorded that you'd like to be contacted in writing only"). There were no threats or false urgency.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, please let me know. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola. What's this about?

**Nora:** Great. To protect your privacy, I'm going to text a six-digit code to your phone number on file. Can you read it out to me when it arrives?

**Ola:** Okay, sure, I'll check my phone. I haven't gotten anything yet, so give me just a moment.

**Nora:** Of course, let me send that now. It's on its way to you now.

**Ola:** Okay, it just came through. The code is 982462.

**Nora:** Right. This is about an unpaid electricity invoice from Northlight Energy for August, and you owe three thousand kroner. I'm calling to help you sort out a way to pay that works for you today.

Would you like to pay the three thousand kroner in one go by the eighth of December, or split it into monthly payments?

**Ola:** Three thousand kroner... I'm sorry, I lost my job last month and I can barely cover rent right now. I can't promise any payment today, I just don't know when I'll have it.

**Nora:** I'm sorry you're in this situation. I'm here to figure this out with you.

The good news is that if we agree a plan and you keep to it, the interest and fees stop right now — so the amount stays at three thousand and you know exactly what to pay. Would one thousand a month be manageable for you?

**Ola:** Honestly, even a thousand a month is too much right now, I don't have any income. Can I have some time, or is there someone I can talk to about my situation?

**Nora:** I understand. Let me connect you with someone from the team who can look at this properly with you. A person from the team will contact you within a week, and nothing needs to be decided today. You can also get free advice from NAV — that's fifty-five, fifty-five, thirty-three, thirty-nine — they help people in your situation all the time. Is there a good time to reach you, or would you rather they contact you in writing?

**Ola:** Thank you, I appreciate that. Could they please contact me in writing, by email or letter, since I'd rather not take calls right now?

**Nora:** I've recorded that you'd like to be contacted in writing only. A colleague will review your situation and be in touch by email or letter. Take care of yourself, and best of luck with finding work.

**Ola:** Thank you, I really appreciate you being kind about this. Goodbye.

## Tool calls
- send_verification_code {}
- verify_code {"code":"982462"}
- escalate {"reason":"hardship","summary":"Ola lost his job last month and has no income. Cannot commit to any payment plan at this time, even one thousand kroner monthly. Needs support.","contact_preference_requested":"none","debtor_quote":"I lost my job last month and I can barely cover rent right now. Even a thousand a month is too much right now, I don't have any income."}
- record_contact_preference {"preference":"written_only"}
