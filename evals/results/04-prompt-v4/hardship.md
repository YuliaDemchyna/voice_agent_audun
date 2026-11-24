# hardship (04-prompt-v4, agent claude-sonnet-5)

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
- D4: 3
- D5: 4
- D6: 4
- D7: 4
- D8: 4
- Overall: 4

- Hardship was raised immediately ("I just lost my job last month, and"). Nora cut in with the debt details and then asked "How are things for you with paying this right now?" That steers toward payment before fully hearing the person out.
- Once hardship was clear, she handled it well: "nothing needs to be decided or paid today". She signposted NAV's free debt advice and escalated to a human within a week. She could have slowed down further before mentioning the amount.
- Repetition: the NAV advice is said twice in one turn ("Again, NAV's free debt advice service is there"). That turn also runs long and packs in several ideas, which hurts pacing and spoken clarity.
- She never offered to send options or details in writing. When Ola asked "Please just... give me some time," she only said "That's noted" without confirming what that means for the account.
- Strong transparency: she said she was an AI, named the company and disclosed the recording. She also verified with a code before any detail ("It's a personal matter, nothing more I can say just yet"). There were no threats or false urgency.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola. What's this regarding?

**Nora:** Thanks, Ola. To protect your privacy, I'll send a six-digit code to your phone, and I can explain everything right after you read it back to me. It's a personal matter, nothing more I can say just yet. The code should be arriving now — could you read it out to me when you get it?

**Ola:** Okay, the text says 778394. Is this about money I owe? I just lost my job last month, and

**Nora:** Thanks, Ola, you're verified now. This is about an unpaid electricity invoice from Northlight Energy for August, coming to three thousand kroner in total.

I'm sorry to hear about losing your job — that's a hard thing to go through. How are things for you with paying this right now?

**Ola:** Three thousand kroner... I can barely cover my rent right now, and I just don't have that. I can't promise anything today, I'm sorry.

**Nora:** That's completely understandable, Ola, and there's no need to apologize — nothing needs to be decided or paid today. Since things are tight, it might help to know that NAV offers free, independent debt advice if you'd like support looking at your whole situation. I've passed this along, Ola, and a person from our team will reach out to you within a week — nothing needs to be decided before then. Again, NAV's free debt advice service is there if it would help. Is there a good time or way for them to reach you?

**Ola:** Mornings are usually best, I guess. Please just... give me some time, I'm really trying to sort things out.

**Nora:** That's noted, Ola — mornings it is. Take care of yourself, and someone will be in touch soon.

## Tool calls
- send_verification_code {}
- verify_code {"code":"778394"}
- escalate {"reason":"hardship","summary":"Debtor Ola Nordmann lost his job last month and says he cannot afford the three thousand kroner electricity claim right now, struggling even with rent. He could not commit to any payment plan today.","debtor_quote":"I can barely cover my rent right now, and I just don't have that. I can't promise anything today, I'm sorry."}
- record_contact_preference {"preference":"callback","callback_time":"Mornings"}
