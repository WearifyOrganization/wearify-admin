// The redaction boundary for everything sent to Sentry.
//
// This app handles phone numbers, OTPs, 6-digit trial-room codes, 4-digit staff
// PINs, device tokens and base64 try-on photographs. `sendDefaultPii: false`
// already stops Sentry attaching cookies, headers and IPs; this is the second
// layer, for PII we put into a message or an error ourselves. It mirrors the
// allowlist discipline in convex/tryOn/telemetry.ts — a stack trace that
// interpolates a customer photo is a privacy incident, not a debugging aid.

// Keys whose value never leaves the device, whatever it holds.
const SECRET_KEY = /(pass|secret|token|auth|cookie|phone|email|otp|pin|dsn|apikey|api_key)/i;

// `code` is both a trial-room/OTP code and a ConvexError discriminant
// ("UNAUTHORIZED"), which is the single most useful field in a report. Redact
// only the numeric form.
const NUMERIC_CODE = /^\d{4,8}$/;

const VALUES: Array<[RegExp, string]> = [
  [/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/gi, "[image]"],
  [/\+91[\s-]?\d{10}\b/g, "[phone]"],
  // Indian mobiles start 6-9, so this cannot eat a 10-digit unix timestamp.
  [/\b[6-9]\d{9}\b/g, "[phone]"],
  [/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, "[email]"],
  [/\b[A-Za-z0-9+/]{64,}={0,2}\b/g, "[blob]"],
  // A secret interpolated into a message has no key to match on, so anchor on
  // the word that introduces it. Caught by the live probe: a template string
  // reading `deviceToken ${t}` shipped the token in full.
  [
    // The value must look like a token — 8+ chars containing a digit — or this
    // eats the next English word ("loginWithOtp failed" -> "loginWithOtp [redacted]").
    /([A-Za-z]*(?:token|otp|password|passwd|secret|apikey|pin))\b(\W{0,3})(?=[A-Za-z0-9._~+/=-]*\d)[A-Za-z0-9._~+/=-]{8,}/gi,
    "$1$2[redacted]",
  ],
];

const MAX_DEPTH = 8;
const MAX_STRING = 2048;

function scrubString(s: string): string {
  let out = s.length > MAX_STRING ? s.slice(0, MAX_STRING) + "…[truncated]" : s;
  for (const [pattern, replacement] of VALUES) out = out.replace(pattern, replacement);
  return out;
}

/** Walks any Sentry payload and redacts in place. Never throws. */
export function scrub<T>(node: T, depth = 0, seen = new WeakSet<object>()): T {
  if (typeof node === "string") return scrubString(node) as T;
  if (node === null || typeof node !== "object" || depth >= MAX_DEPTH) return node;
  if (seen.has(node as object)) return node;
  seen.add(node as object);

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = scrub(node[i], depth + 1, seen);
    return node;
  }

  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (SECRET_KEY.test(key)) {
      record[key] = "[redacted]";
    } else if (key === "code" && typeof value === "string" && NUMERIC_CODE.test(value)) {
      record[key] = "[redacted]";
    } else {
      record[key] = scrub(value, depth + 1, seen);
    }
  }
  return node;
}

/** `beforeSend` / `beforeSendTransaction` / `beforeBreadcrumb` hook. */
export function scrubEvent<T extends object | null>(event: T): T {
  if (!event) return event;
  try {
    return scrub(event);
  } catch {
    // Instrumentation must never break the app, and an un-scrubbable event is
    // not worth the risk of shipping raw.
    return null as T;
  }
}
