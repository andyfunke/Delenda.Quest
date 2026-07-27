import { NextResponse } from "next/server";
import {
  GUEST_SESSION_COOKIE,
  isSessionId,
  safeRelativeReturnPath,
} from "../../auth";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeRelativeReturnPath(
    url.searchParams.get("return_to") ?? "/",
  );
  const response = NextResponse.redirect(new URL(returnTo, url.origin));

  if (url.searchParams.get("logout") === "1") {
    response.cookies.delete(GUEST_SESSION_COOKIE);
    return response;
  }

  const currentSession = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GUEST_SESSION_COOKIE}=`))
    ?.slice(GUEST_SESSION_COOKIE.length + 1);

  response.cookies.set(
    GUEST_SESSION_COOKIE,
    currentSession && isSessionId(currentSession)
      ? currentSession
      : crypto.randomUUID(),
    {
      httpOnly: true,
      maxAge: ONE_YEAR_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: true,
    },
  );
  return response;
}
