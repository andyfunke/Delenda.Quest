import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  provider: "chatgpt" | "cloudflare-access";
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
const CLOUDFLARE_ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (email) {
    const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
    const fullName =
      encodedFullName &&
      requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
        ? safeDecodeURIComponent(encodedFullName)
        : null;

    return {
      displayName: fullName ?? email,
      email,
      fullName,
      provider: "chatgpt",
    };
  }

  const runtimeEnv = await getRuntimeEnv();
  if (runtimeEnv?.DELENDA_AUTH_PROVIDER !== "cloudflare-access") return null;

  const token = requestHeaders.get(CLOUDFLARE_ACCESS_JWT_HEADER);
  const teamDomain = normalizedTeamDomain(runtimeEnv.CF_ACCESS_TEAM_DOMAIN);
  const audience = runtimeEnv.CF_ACCESS_AUD?.trim();
  if (!token || !teamDomain || !audience) return null;

  try {
    const jwks = createRemoteJWKSet(
      new URL("/cdn-cgi/access/certs", teamDomain),
    );
    const { payload } = await jwtVerify(token, jwks, {
      audience,
      issuer: teamDomain,
    });
    const accessEmail =
      typeof payload.email === "string" ? payload.email.trim() : "";
    if (!accessEmail) return null;

    return {
      displayName: accessEmail,
      email: accessEmail,
      fullName: null,
      provider: "cloudflare-access",
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Cloudflare Access JWT verification failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    return null;
  }
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  if ((await getRuntimeEnv())?.DELENDA_AUTH_PROVIDER === "cloudflare-access") {
    throw new Error(
      "Cloudflare Access did not supply a valid application token. Verify that the shadow Worker is protected by the configured Access application.",
    );
  }

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export async function authenticatedSignInPath(
  returnTo: string,
): Promise<string> {
  return (await getRuntimeEnv())?.DELENDA_AUTH_PROVIDER === "cloudflare-access"
    ? safeRelativeReturnPath(returnTo)
    : chatGPTSignInPath(returnTo);
}

export function authenticatedSignOutPath(
  user: ChatGPTUser,
  returnTo = "/",
): string {
  return user.provider === "cloudflare-access"
    ? "/cdn-cgi/access/logout"
    : chatGPTSignOutPath(returnTo);
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function normalizedTeamDomain(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function getRuntimeEnv(): Promise<Cloudflare.Env | null> {
  try {
    return (await import("cloudflare:workers")).env;
  } catch {
    // Node-based artifact validation does not implement the Workers-only module.
    return null;
  }
}
