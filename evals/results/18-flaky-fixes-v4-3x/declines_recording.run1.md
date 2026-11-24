# declines_recording (18-flaky-fixes-v4-3x, run 1/3, agent claude-haiku-4-5-20251001)

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
- D8: 3
- Overall: 4

- Inconsistent promise: "Let me get a person to help you instead" suggests an immediate transfer, but Nora then says "A person from our team will be in touch with you instead." The caller is left unsure what happens next.
- No concrete next step: there is no timeframe or contact window for the human follow-up, so there is no dated next step.
- Awkward spoken order: "Of course." comes after the handoff line rather than as the acknowledgement. This makes the turn sound stitched together and repetitive ("instead" twice).
- Strong opening: "Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded..." gives identity, AI status and a recording notice with an opt-out. No debt details were disclosed before verification.
- The recording refusal was respected without pushback, and Nora explained honestly why: "I'm an AI assistant, so I can't handle this call without recording."
- No hardship or vulnerability signals were present, so D5 scores 5.

## Transcript
**Nora:** Hi, this is Nora, an AI assistant calling from Nordvik Collections. This call is recorded and transcribed for quality; if you'd rather it wasn't, please let me know. Am I speaking with Ola Nordmann?

**Ola:** Yes, this is Ola, but I don't want this call recorded. I'm not willing to continue if it is.

**Nora:** I understand. Let me get a person to help you instead. Of course. I'm an AI assistant, so I can't handle this call without recording. A person from our team will be in touch with you instead.

## Tool calls
- escalate {"reason":"recording_declined","summary":"Ola Nordmann has declined recording and transcription of the call and is unwilling to continue under those conditions.","contact_preference_requested":"none","debtor_quote":"I don't want this call recorded. I'm not willing to continue if it is."}
