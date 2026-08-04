import { NextResponse } from "next/server";
import { labCreateBatch, labList } from "../../../../packages/contentgen-lab/src/workflow.mjs";
import { createLabContext, mapLabError } from "./_lab-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await createLabContext();
    return NextResponse.json(await labList(ctx));
  } catch (error) {
    const mapped = mapLabError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      medium?: string;
      sourceVersion?: string;
      seed?: number;
      samplePolicy?: "uniform" | "curiosity-weighted";
      batchSize?: number;
      judgeId?: string;
    };
    if (
      !body.medium ||
      !body.sourceVersion ||
      typeof body.seed !== "number" ||
      typeof body.batchSize !== "number"
    ) {
      return NextResponse.json(
        { error: "medium, sourceVersion, seed, and batchSize are required." },
        { status: 400 },
      );
    }
    const ctx = await createLabContext();
    return NextResponse.json(
      await labCreateBatch(ctx, {
        medium: body.medium,
        sourceVersion: body.sourceVersion,
        seed: body.seed,
        samplePolicy: body.samplePolicy,
        batchSize: body.batchSize,
        judgeId: body.judgeId ?? "NONE",
      }),
    );
  } catch (error) {
    const mapped = mapLabError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
