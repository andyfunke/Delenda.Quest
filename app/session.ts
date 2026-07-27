// Self-hosted, stateless sign-in sessions for the GitHub-backed Cloudflare
// Worker deployment. A session is an HMAC-SHA256 signed token carried in an
// HttpOnly cookie. This replaces the ChatGPT Sites identity dispatch that used
// to inject `oai-authenticated-user-email`, without requiring Cloudflare Access
// to be provisioned. The Cloudflare Access path in `chatgpt-auth.ts` stays
// intact for deployments that opt back into it.

export type SessionPayload = {
  email: string;
  name: string;
  admin: boolean;
  iat: number;
  exp: number;
};

export const SESSION_COOKIE = "delenda_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Only used when `DELENDA_SESSION_SECRET` is absent (local development). It is
// intentionally obvious so it can never be mistaken for a production secret.
const DEV_FALLBACK_SECRET = "delenda-quest-local-development-session-secret";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1)
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return mismatch === 0;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeSignInEmail(rawEmail: unknown): string | null {
  if (typeof rawEmail !== "string") return null;
  const email = rawEmail.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email))
    return null;
  return email;
}

export function normalizeDisplayName(
  rawName: unknown,
  fallback: string,
): string {
  if (typeof rawName !== "string") return fallback;
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 60);
  return name.length ? name : fallback;
}

export async function signSession(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(secret, body));
  return `${body}.${signature}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const separator = token.indexOf(".");
  if (separator <= 0) return null;
  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!body || !signature) return null;

  const expected = bytesToBase64Url(await hmac(secret, body));
  if (!constantTimeEquals(signature, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(decoder.decode(base64UrlToBytes(body)));
  } catch {
    return null;
  }
  if (!isSessionPayload(payload)) return null;
  if (payload.exp <= Math.floor(now / 1000)) return null;
  return payload;
}

export function newSessionPayload(input: {
  email: string;
  name: string;
  admin: boolean;
  now?: number;
}): SessionPayload {
  const issuedAt = Math.floor((input.now ?? Date.now()) / 1000);
  return {
    email: input.email,
    name: input.name,
    admin: input.admin,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
  };
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.email === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.admin === "boolean" &&
    typeof candidate.iat === "number" &&
    typeof candidate.exp === "number"
  );
}

// Resolve the signing secret from the Worker environment, falling back to a
// well-known development value when running outside Cloudflare (local `vite`
// dev, Node-based artifact validation). Production must set
// `DELENDA_SESSION_SECRET`; otherwise sessions are signed with a guessable key.
export async function resolveSessionSecret(): Promise<string> {
  try {
    const { env } = await import("cloudflare:workers");
    const configured = env.DELENDA_SESSION_SECRET?.trim();
    if (configured) return configured;
  } catch {
    // Not running inside the Workers runtime.
  }
  return DEV_FALLBACK_SECRET;
}
