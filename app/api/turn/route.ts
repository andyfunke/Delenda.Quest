import { NextResponse } from "next/server";
import {
  accountTurnSnapshot,
  claimDailyResolution,
  setGodMode,
} from "../../../db/turns";
import { getAuthenticatedUser } from "../../auth";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in before accessing campaign turnover." },
      { status: 401 },
    );
  return NextResponse.json(await accountTurnSnapshot(user));
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in before resolving a campaign day." },
      { status: 401 },
    );
  try {
    const body = (await request.json()) as {
      campaignId?: unknown;
      campaignDay?: unknown;
    };
    const result = await claimDailyResolution(user, body);
    return NextResponse.json(result, { status: result.allowed ? 200 : 409 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Campaign turnover could not be claimed.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in before changing campaign turnover." },
      { status: 401 },
    );
  const body = (await request.json()) as { godMode?: unknown };
  if (typeof body.godMode !== "boolean")
    return NextResponse.json(
      { error: "A godmode state is required." },
      { status: 400 },
    );
  return NextResponse.json(await setGodMode(user, body.godMode));
}
