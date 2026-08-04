#!/usr/bin/env node
import { validatePacingTablesFile } from "../packages/campaign-metastratum/src/tables-validate.mjs";

const path = process.argv[2] ?? "campaign/tables/v1/pacing-tables.json";
const report = validatePacingTablesFile(path);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
