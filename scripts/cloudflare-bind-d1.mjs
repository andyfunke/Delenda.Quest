#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const [databaseId] = process.argv.slice(2);
if (!databaseId || !/^[0-9a-f-]{36}$/iu.test(databaseId)) {
  console.error("usage: node scripts/cloudflare-bind-d1.mjs <database-uuid>");
  process.exit(64);
}

const configUrl = new URL("../cloudflare/wrangler.jsonc", import.meta.url);
const config = JSON.parse(await readFile(configUrl, "utf8"));
const binding = config.d1_databases?.find((entry) => entry.binding === "DB");
if (!binding) throw new Error("cloudflare/wrangler.jsonc has no DB binding.");
binding.database_id = databaseId;
await writeFile(configUrl, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log("Bound DB to the Cloudflare shadow database.");
