import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const REPLICATION_TABLES = [
  "users",
  "account_turn_state",
  "active_campaigns",
  "campaign_records",
  "friendships",
  "friend_invites",
  "campaign_packs",
  "telemetry_counters",
  "bug_reports",
  "campaign_outcomes",
  "account_rotation_ledger",
] as const;

type ReplicationTable = (typeof REPLICATION_TABLES)[number];
type ReplicationRow = Record<string, unknown> & { __rowid: number };

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 250;
const SNAPSHOT_FORMAT = "delenda-d1-snapshot-v1";
// Version the exported table contract, not the private migration count.
// Migration 0014 adds one exported active_campaigns column; its authority
// grant table is deliberately absent from REPLICATION_TABLES.
const REPLICATION_SCHEMA_VERSION = 13;

export async function GET(request: Request) {
  const { env } = await import("cloudflare:workers");
  if (!(await isAuthorized(request, env)))
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const url = new URL(request.url);
  const table = url.searchParams.get("table");
  if (!table) {
    return noStoreJson({
      format: SNAPSHOT_FORMAT,
      schemaVersion: REPLICATION_SCHEMA_VERSION,
      tables: REPLICATION_TABLES,
    });
  }
  if (!isReplicationTable(table))
    return noStoreJson({ error: "Unknown replication table." }, 400);

  const cursor = boundedInteger(url.searchParams.get("cursor"), 0, 0);
  const pageSize = boundedInteger(
    url.searchParams.get("limit"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );
  const statement = env.DB.prepare(
    `SELECT rowid AS __rowid, * FROM "${table}" WHERE rowid > ? ORDER BY rowid LIMIT ?`,
  ).bind(cursor, pageSize + 1);
  const result = await statement.all<ReplicationRow>();
  const hasMore = result.results.length > pageSize;
  const rows = result.results.slice(0, pageSize);
  const count = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM "${table}"`,
  ).first<{ count: number }>();

  return noStoreJson({
    format: SNAPSHOT_FORMAT,
    table,
    count: count?.count ?? 0,
    rows,
    nextCursor:
      hasMore && rows.length ? rows[rows.length - 1].__rowid : null,
  });
}

async function isAuthorized(
  request: Request,
  runtimeEnv: Cloudflare.Env,
): Promise<boolean> {
  const expected = runtimeEnv.DELENDA_REPLICATION_TOKEN?.trim();
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!expected || !supplied) return false;

  const encoder = new TextEncoder();
  const [expectedHash, suppliedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
  ]);
  return timingSafeEqual(
    new Uint8Array(expectedHash),
    new Uint8Array(suppliedHash),
  );
}

function isReplicationTable(value: string): value is ReplicationTable {
  return (REPLICATION_TABLES as readonly string[]).includes(value);
}

function boundedInteger(
  rawValue: string | null,
  fallback: number,
  maximum: number,
): number {
  if (rawValue === null) return fallback;
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 0) return fallback;
  return maximum > 0 ? Math.min(value, maximum) : value;
}

function noStoreJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
