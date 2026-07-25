#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const FORMAT = "delenda-d1-snapshot-v1";
const SHADOW_DATABASE = "delenda-quest-shadow";
const TABLES = [
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
];
const TABLE_SET = new Set(TABLES);

const [command, ...rawArguments] = process.argv.slice(2);
const argumentsMap = parseArguments(rawArguments);

try {
  if (command === "export") await exportSnapshot(argumentsMap);
  else if (command === "compare") await compareSnapshots(argumentsMap);
  else if (command === "sql") await snapshotToSql(argumentsMap);
  else usage();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function exportSnapshot(argumentsMap) {
  const source = requiredUrl(argumentsMap, "source");
  const output = requiredPath(argumentsMap, "output");
  const token = process.env.DELENDA_REPLICATION_TOKEN?.trim();
  if (!token)
    throw new Error(
      "DELENDA_REPLICATION_TOKEN must be present in the process environment.",
    );

  const manifest = await replicationRequest(source, token);
  if (
    manifest.format !== FORMAT ||
    !Array.isArray(manifest.tables) ||
    manifest.tables.some((table) => !TABLE_SET.has(table))
  )
    throw new Error("The source returned an unsupported replication manifest.");

  const snapshot = {
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    source: source.origin,
    schemaVersion: manifest.schemaVersion,
    tables: {},
  };

  for (const table of TABLES) {
    if (!manifest.tables.includes(table))
      throw new Error(`The source manifest is missing ${table}.`);
    const rows = [];
    let cursor = 0;
    let expectedCount = null;
    do {
      const page = await replicationRequest(source, token, {
        table,
        cursor: String(cursor),
        limit: "250",
      });
      if (
        page.format !== FORMAT ||
        page.table !== table ||
        !Array.isArray(page.rows)
      )
        throw new Error(`The source returned an invalid ${table} page.`);
      expectedCount = page.count;
      rows.push(...page.rows);
      cursor = page.nextCursor ?? 0;
    } while (cursor);

    if (rows.length !== expectedCount)
      throw new Error(
        `${table} changed during export: expected ${expectedCount} rows and received ${rows.length}. Run the export again.`,
      );

    const dataRows = rows.map(stripRowId);
    snapshot.tables[table] = {
      count: dataRows.length,
      sha256: tableHash(dataRows),
      rows: dataRows,
    };
    console.log(`${table}: ${dataRows.length} rows`);
  }

  await writeFile(output, `${JSON.stringify(snapshot)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(output, 0o600);
  console.log(`Snapshot written to ${output}`);
}

async function compareSnapshots(argumentsMap) {
  const leftPath = requiredPath(argumentsMap, "left");
  const rightPath = requiredPath(argumentsMap, "right");
  const [left, right] = await Promise.all([
    loadSnapshot(leftPath),
    loadSnapshot(rightPath),
  ]);
  let different = false;

  for (const table of TABLES) {
    const leftTable = left.tables[table];
    const rightTable = right.tables[table];
    const matches =
      leftTable.count === rightTable.count &&
      leftTable.sha256 === rightTable.sha256;
    console.log(
      `${matches ? "MATCH" : "DIFF "} ${table}: ${leftTable.count}/${rightTable.count} rows`,
    );
    different ||= !matches;
  }
  if (different) throw new Error("Snapshots differ. Cutover is blocked.");
  console.log("Snapshots match exactly. The shadow database is verified.");
}

async function snapshotToSql(argumentsMap) {
  const snapshotPath = requiredPath(argumentsMap, "snapshot");
  const output = requiredPath(argumentsMap, "output");
  if (argumentsMap.get("confirm-target-reset") !== SHADOW_DATABASE)
    throw new Error(
      `Refusing to generate reset SQL. Pass --confirm-target-reset ${SHADOW_DATABASE}. This guard prevents the source database from becoming a target.`,
    );
  const snapshot = await loadSnapshot(snapshotPath);
  const statements = [
    "-- DELENDA.QUEST shadow import. This resets only delenda-quest-shadow.",
    "PRAGMA foreign_keys = OFF;",
  ];

  for (const table of [...TABLES].reverse())
    statements.push(`DELETE FROM "${table}";`);
  for (const table of TABLES) {
    for (const row of snapshot.tables[table].rows) {
      const columns = Object.keys(row);
      if (!columns.length) continue;
      const columnSql = columns.map(quoteIdentifier).join(", ");
      const valueSql = columns.map((column) => sqlLiteral(row[column])).join(", ");
      statements.push(
        `INSERT INTO "${table}" (${columnSql}) VALUES (${valueSql});`,
      );
    }
  }
  statements.push("PRAGMA foreign_keys = ON;");
  await writeFile(output, `${statements.join("\n")}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(output, 0o600);
  console.log(`Shadow import SQL written to ${output}`);
}

async function replicationRequest(source, token, query = {}) {
  const url = new URL("/api/admin/replication", source);
  for (const [key, value] of Object.entries(query))
    url.searchParams.set(key, value);
  const accessClientId = process.env.CF_ACCESS_CLIENT_ID?.trim();
  const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim();
  if (!!accessClientId !== !!accessClientSecret)
    throw new Error(
      "Set both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET, or neither.",
    );
  const headers = { Authorization: `Bearer ${token}` };
  if (accessClientId && accessClientSecret) {
    headers["CF-Access-Client-Id"] = accessClientId;
    headers["CF-Access-Client-Secret"] = accessClientSecret;
  }
  const response = await fetch(url, {
    headers,
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `Replication request failed with HTTP ${response.status} at ${url.pathname}.`,
    );
  return response.json();
}

async function loadSnapshot(path) {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (parsed?.format !== FORMAT || !parsed.tables)
    throw new Error(`${path} is not a ${FORMAT} snapshot.`);
  for (const table of TABLES) {
    const entry = parsed.tables[table];
    if (
      !entry ||
      !Array.isArray(entry.rows) ||
      entry.count !== entry.rows.length ||
      entry.sha256 !== tableHash(entry.rows)
    )
      throw new Error(`${path} has an invalid ${table} section.`);
  }
  return parsed;
}

function stripRowId(row) {
  if (!row || typeof row !== "object" || Array.isArray(row))
    throw new Error("A replication row was not an object.");
  const { __rowid: ignored, ...data } = row;
  void ignored;
  return data;
}

function tableHash(rows) {
  return createHash("sha256").update(canonicalJson(rows)).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function quoteIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/u.test(value))
    throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}

function sqlLiteral(value) {
  if (value === null) return "NULL";
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  throw new Error(`Unsupported snapshot value type: ${typeof value}`);
}

function parseArguments(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined) usage();
    parsed.set(key.slice(2), value);
  }
  return parsed;
}

function requiredPath(argumentsMap, name) {
  const value = argumentsMap.get(name);
  if (!value) throw new Error(`Missing --${name}.`);
  return resolve(value);
}

function requiredUrl(argumentsMap, name) {
  const value = argumentsMap.get(name);
  if (!value) throw new Error(`Missing --${name}.`);
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
  )
    throw new Error(`--${name} must use HTTPS or local HTTP.`);
  return url;
}

function usage() {
  console.error(
    [
      "usage:",
      "  node scripts/cloudflare-snapshot.mjs export --source https://host --output /secure/path/snapshot.json",
      "  node scripts/cloudflare-snapshot.mjs compare --left source.json --right shadow.json",
      `  node scripts/cloudflare-snapshot.mjs sql --snapshot source.json --output /secure/path/import.sql --confirm-target-reset ${SHADOW_DATABASE}`,
    ].join("\n"),
  );
  process.exit(64);
}
