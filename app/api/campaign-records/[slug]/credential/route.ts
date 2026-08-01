import { NextResponse } from "next/server";
import { campaignCredential } from "../../../../credential";
import { publicCampaignRecord } from "../../../../../db/campaign-records";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const record = await publicCampaignRecord(slug);
  if (!record)
    return NextResponse.json(
      { error: "Campaign credential not found." },
      { status: 404 },
    );
  const credential = await campaignCredential(record);
  return NextResponse.json(credential, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
}
