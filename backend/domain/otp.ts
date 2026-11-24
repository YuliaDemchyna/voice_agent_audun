// One-time code issue and verification (rulebook C2). Pure: time and randomness are injected.

export interface OtpState {
  code: string;
  expiresAt: number; // epoch ms
  failedAttempts: number;
}

export interface OtpConfig {
  ttlSeconds: number;
  maxAttempts: number;
}

export function issueOtp(now: number, config: OtpConfig, random: () => number = Math.random): OtpState {
  const code = String(Math.floor(random() * 1_000_000)).padStart(6, "0");
  return { code, expiresAt: now + config.ttlSeconds * 1000, failedAttempts: 0 };
}

export type OtpCheck =
  | { ok: true }
  | { ok: false; reason: "no_code_sent" | "expired" | "locked" | "mismatch"; attemptsLeft: number };

export function checkOtp(state: OtpState | undefined, input: string, now: number, config: OtpConfig): { result: OtpCheck; state: OtpState | undefined } {
  if (!state) return { result: { ok: false, reason: "no_code_sent", attemptsLeft: config.maxAttempts }, state };
  if (state.failedAttempts >= config.maxAttempts) {
    return { result: { ok: false, reason: "locked", attemptsLeft: 0 }, state };
  }
  if (now > state.expiresAt) return { result: { ok: false, reason: "expired", attemptsLeft: config.maxAttempts - state.failedAttempts }, state };
  const normalised = input.replace(/\D/g, "");
  if (normalised === state.code) return { result: { ok: true }, state };
  const next = { ...state, failedAttempts: state.failedAttempts + 1 };
  const attemptsLeft = config.maxAttempts - next.failedAttempts;
  return { result: { ok: false, reason: attemptsLeft <= 0 ? "locked" : "mismatch", attemptsLeft }, state: next };
}
