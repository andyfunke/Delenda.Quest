import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  newSessionPayload,
  normalizeDisplayName,
  normalizeSignInEmail,
  resolveSessionSecret,
  signSession,
} from "../../session";

export const dynamic = "force-dynamic";

function safeReturnTo(rawValue: FormDataEntryValue | null): string {
  if (typeof rawValue !== "string") return "/game";
  if (!rawValue.startsWith("/") || rawValue.startsWith("//")) return "/game";
  if (rawValue === "/signin" || rawValue.startsWith("/signin?")) return "/game";
  return rawValue;
}

function signInRedirect(request: Request, returnTo: string, error: string) {
  const target = new URL("/signin", request.url);
  target.searchParams.set("return_to", returnTo);
  target.searchParams.set("error", error);
  return NextResponse.redirect(target, { status: 303 });
}

async function resolveAdmin(
  suppliedKey: string,
  email: string,
): Promise<{ admin: boolean; error: string | null }> {
  if (!suppliedKey) return { admin: false, error: null };
  let adminKey = "";
  let allowedEmails: string[] = [];
  try {
    const { env } = await import("cloudflare:workers");
    adminKey = env.DELENDA_ADMIN_KEY?.trim() ?? "";
    allowedEmails = (env.DELENDA_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    // Outside the Workers runtime there is no administrator key configured.
  }
  if (!adminKey || suppliedKey !== adminKey)
    return { admin: false, error: "Administrator key was not accepted." };
  if (!allowedEmails.includes(email))
    return { admin: false, error: "This email is not an administrator." };
  return { admin: true, error: null };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safeReturnTo(form.get("return_to"));

  const email = normalizeSignInEmail(form.get("email"));
  if (!email)
    return signInRedirect(request, returnTo, "Enter a valid email address.");

  const name = normalizeDisplayName(form.get("name"), email);
  const suppliedKey =
    typeof form.get("admin_key") === "string"
      ? (form.get("admin_key") as string).trim()
      : "";

  const admin = await resolveAdmin(suppliedKey, email);
  if (admin.error) return signInRedirect(request, returnTo, admin.error);

  const token = await signSession(
    newSessionPayload({ email, name, admin: admin.admin }),
    await resolveSessionSecret(),
  );

  const response = NextResponse.redirect(new URL(returnTo, request.url), {
    status: 303,
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
