import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AuthenticatedUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  provider: "guest";
};

export const GUEST_SESSION_COOKIE = "delenda_guest_session";

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const sessionId = (await cookies()).get(GUEST_SESSION_COOKIE)?.value;
  if (!sessionId || !isSessionId(sessionId)) return null;

  return {
    displayName: "Guest Commander",
    email: `guest-${sessionId}@guest.delenda.quest`,
    fullName: null,
    provider: "guest",
  };
}

export async function requireAuthenticatedUser(
  returnTo: string,
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (user) return user;
  redirect(sessionPath(returnTo));
}

export async function authenticatedSignInPath(
  returnTo: string,
): Promise<string> {
  return sessionPath(returnTo);
}

export function authenticatedSignOutPath(
  _user: AuthenticatedUser,
  returnTo = "/",
): string {
  return `/api/session?logout=1&return_to=${encodeURIComponent(
    safeRelativeReturnPath(returnTo),
  )}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    if (url.pathname === "/api/session") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function isSessionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function sessionPath(returnTo: string): string {
  return `/api/session?return_to=${encodeURIComponent(
    safeRelativeReturnPath(returnTo),
  )}`;
}
