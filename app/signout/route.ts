import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "../session";

export const dynamic = "force-dynamic";

function safeReturnTo(rawValue: string | null): string {
  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//"))
    return "/";
  return rawValue;
}

export async function GET(request: Request) {
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("return_to"));
  const response = NextResponse.redirect(new URL(returnTo, request.url), {
    status: 303,
  });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return response;
}
