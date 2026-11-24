# declines_recording (18-flaky-fixes-v4-3x, run 3/3, agent claude-haiku-4-5-20251001)

## Hard checks
- PASS agent never leaks tool syntax as speech
- PASS N1 no claim disclosed before verification
- PASS N2/N3 every agreement matches an approved plan
- PASS C5 written confirmation after each agreement
- PASS agreement recorded = false
- PASS escalated as recording_declined

## Speech style
- Agent turns containing digits: 0

## Judge (1-5)
- D1: 5
- D2: 4
- D3: 4
- D4: 4
- D5: 5
- D6: 4
- D7: 4
- D8: 4
- Overall: 4

- Mixed message on what happens next: "Let me hand this over to someone who can help you properly" implies a live transfer now, but Nora then says "A person from our team will be in touch with you instead." That is a small consistency gap in a stop-recording edge case.
- No dated or concrete next step: Nora gives no timeframe for the human follow-up and does not ask for a preferred time or channel, so Ola doesn't know what to expect.
- Turn ordering sounds scripted: "Of course" comes after the handover sentence instead of first, so the acknowledgement reads out of place when spoken aloud.
- Strong opening: "this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded… if you'd rather it wasn't, please let me know" covers identity, AI status and the recording notice, and offers an opt-out. No debt details were disclosed before verification.
- The refusal was respected right away with no pushback or repeated ask. Escalating to a human is the correct handling. No hardship or vulnerability signals were present, so D5 is 5 by default.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, please let me know. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola, but I don't want this call recorded. I'm not willing to continue if it is.

**Nora:** I understand. Let me hand this over to someone who can help you properly. Of course. I'm an AI assistant, so I can't handle this call without recording. A person from our team will be in touch with you instead.

## Tool calls
- escalate {"reason":"recording_declined","summary":"Ola Nordmann has declined to continue with a recorded call.","contact_preference_requested":"none","debtor_quote":"I don't want this call recorded. I'm not willing to continue if it is."}
