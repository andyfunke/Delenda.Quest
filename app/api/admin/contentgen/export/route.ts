import { NextResponse } from "next/server";
import { labExport } from "../../../../../packages/contentgen-lab/src/workflow.mjs";
import { createLabContext, mapLabError } from "../_lab-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { batchId?: string };
    if (!body.batchId) {
      return NextResponse.json({ error: "batchId required." }, { status: 400 });
    }
    const ctx = await createLabContext();
    return NextResponse.json(await labExport(ctx, body.batchId));
  } catch (error) {
    const mapped = mapLabError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
