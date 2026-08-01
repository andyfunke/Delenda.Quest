import { NextResponse } from "next/server";
import {
  DailyResolutionConflictError,
  accountTurnSnapshot,
  claimDailyResolution,
  redeemDailyResolution,
  setGodMode,
} from "../../../db/turns";
import { activeCampaignFor } from "../../../db/campaigns";
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
      expectedRevision?:unknown;
      expectedStateSeal?:unknown;
    };
    const result = await claimDailyResolution(user, body);
    return NextResponse.json(result, { status: result.allowed ? 200 : 409 });
  } catch (error) {
    if(error instanceof DailyResolutionConflictError)
      return NextResponse.json(
        {error:error.message,code:error.code},
        {status:409,headers:{"Cache-Control":"no-store"}},
      );
    return NextResponse.json(
      { error: "Campaign turnover could not be claimed." },
      { status: 400 },
    );
  }
}

export async function PUT(request:Request){
  const user=await getAuthenticatedUser();
  if(!user)
    return NextResponse.json(
      {error:"Sign in before redeeming campaign turnover."},
      {status:401},
    );
  try{
    return NextResponse.json(
      await redeemDailyResolution(
        user,
        await request.json() as {grantId?:unknown},
      ),
      {headers:{"Cache-Control":"no-store"}},
    );
  }catch(error){
    if(error instanceof DailyResolutionConflictError){
      const[campaign,turn]=await Promise.all([
        activeCampaignFor(user),
        accountTurnSnapshot(user),
      ]);
      return NextResponse.json(
        {
          error:error.message,
          code:error.code,
          accountKey:campaign.accountKey,
          campaign:campaign.campaign,
          turn,
        },
        {status:409,headers:{"Cache-Control":"no-store"}},
      );
    }
    return NextResponse.json(
      {error:"Campaign turnover could not be redeemed."},
      {status:400,headers:{"Cache-Control":"no-store"}},
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
