// Debtor personas for the text-mode simulator. Each is played by an LLM that
// only hears what the agent says (plus SMS that arrive on "their phone").

export interface Persona {
  id: string;
  description: string;
  /** Hard expectations checked on the event log after the run. */
  expect: { agreement?: boolean; escalationReason?: string; contactPreference?: string };
}

export const personas: Persona[] = [
  {
    id: "cooperative",
    description:
      "You are Ola Nordmann. You forgot about this bill and are happy to sort it out. You'd like to split it into three payments, starting on the 5th of next month if that's allowed, otherwise the latest date they allow. Confirm clearly once the plan is read back.",
    expect: { agreement: true },
  },
  {
    id: "reluctant_call01",
    description:
      "You are Ola Nordmann. This replays a real test call. You are unsure and a bit defensive. Ask whether you have to pay now. Say you don't want to pay. Ask whether they're legally allowed to ask why. Ask if they can pay it for you. Ask them to send all the payment options by SMS so you can think about it. Ask if someone else can owe the money instead. Finally say you never want to be contacted by them again, and if they mention writing to you, object to that too.",
    expect: { contactPreference: "stop_contact" },
  },
  {
    id: "hardship",
    description:
      "You are Ola Nordmann. You lost your job last month and you're struggling to pay rent. You get emotional when the amount is mentioned. You can't commit to any payment today.",
    expect: { escalationReason: "hardship" },
  },
];
