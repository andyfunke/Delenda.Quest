import { NextResponse } from "next/server";
import { labReview } from "../../../../../../packages/contentgen-lab/src/workflow.mjs";
import { createLabContext, mapLabError } from "../../_lab-context";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ candidateId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { candidateId } = await params;
    const body = (await request.json()) as {
      expectedRevision?: number;
      idempotencyKey?: string;
      disposition?: string;
      reasonCodes?: string[];
      notes?: string | null;
      revisedText?: string | null;
    };
    if (
      typeof body.expectedRevision !== "number" ||
      !body.idempotencyKey ||
      !body.disposition ||
      !Array.isArray(body.reasonCodes)
    ) {
      return NextResponse.json(
        { error: "expectedRevision, idempotencyKey, disposition, reasonCodes required." },
        { status: 400 },
      );
    }
    const ctx = await createLabContext();
    return NextResponse.json(
      await labReview(ctx, {
        candidateId,
        expectedRevision: body.expectedRevision,
        idempotencyKey: body.idempotencyKey,
        disposition: body.disposition as never,
        reasonCodes: body.reasonCodes,
        notes: body.notes,
        revisedText: body.revisedText,
      }),
    );
  } catch (error) {
    const mapped = mapLabError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
