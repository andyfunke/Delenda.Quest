import { NextResponse } from "next/server";
import { labClose, labGetBatch } from "../../../../../../packages/contentgen-lab/src/workflow.mjs";
import { createLabContext, mapLabError } from "../../_lab-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ batchId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { batchId } = await params;
    const ctx = await createLabContext();
    return NextResponse.json(await labGetBatch(ctx, batchId));
  } catch (error) {
    const mapped = mapLabError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { batchId } = await params;
    const body = (await request.json()) as { action?: string };
    if (body.action !== "close") {
      return NextResponse.json({ error: "Unsupported batch action." }, { status: 400 });
    }
    const ctx = await createLabContext();
    return NextResponse.json(await labClose(ctx, batchId));
  } catch (error) {
    const mapped = mapLabError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
