import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("campaign UI keeps one deferred report and consistent order language", async () => {
  const [page,packet]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/OperationsPacket.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(page,/label="ORDERS ISSUED"/);
  assert.match(page,/ISSUE ORDER →/);
  assert.doesNotMatch(page,/ISSUE OPERATIONAL ORDER|SHOW FULL CALCULATION|SHOW PRESSURE CALCULUS/i);
  assert.match(packet,/label="ENEMY DEPLOYED"/);
  assert.match(packet,/label="EFFECTIVE FORCE RATIO"/);
  assert.match(packet,/label:"FRONTAGE"/);
  assert.doesNotMatch(packet,/label="FRONTAGE"/);
  for(const id of ["terrain-conversion","ground-condition","command-network","operational-supply","intelligence"]){
    assert.match(packet,new RegExp(`id:"${id}"`));
  }
});

test("diplomacy separates foreign actors from diplomatic actions",async()=>{
  const[page,panel]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/DiplomacyPanel.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(page,/FOREIGN ACTORS/);
  assert.match(page,/diplomacy-command-rail/);
  assert.match(page,/directive-family-menu/);
  assert.match(panel,/SELECTED FOREIGN ACTOR/);
  assert.doesNotMatch(panel,/<nav>/);
});

test("daily brief is a second renderer over the same convergence substrate",async()=>{
  const[page,briefing,convergence,css]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/convergence.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  assert.match(page,/interfaceMode===\"briefing\"/);
  assert.match(page,/executeAvaPlan/);
  assert.match(page,/buildAvaPlan/);
  assert.match(page,/DAILY BRIEF/);
  for(const domain of ["PRIMARY · MAIN CAMPAIGN","SITUATIONAL · DOMESTIC","SITUATIONAL · NETWORK"]){
    assert.match(briefing,new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  }
  assert.match(briefing,/GENERATED FROM THE ACTIVE SECTOR GRAPH/);
  assert.match(convergence,/CONVERGENCE_MATRIX_VERSION=SUB_MISSION_SCHEMA_VERSION/);
  assert.match(briefing,/TheaterGeometry/);
  assert.doesNotMatch(briefing,/openModule/);
  assert.doesNotMatch(briefing,/openManual/);
  assert.match(briefing,/modern-dialog-scrim/);
  assert.match(briefing,/focusFamilyId/);
  assert.match(briefing,/briefing-open-manual/);
  assert.match(page,/resolveDay=\{advance\}/);
  assert.doesNotMatch(page,/resolveDay=\{\(\)=>setDayModal\(true\)\}/);
  assert.match(css,/\.briefing-ui/);
});

test("campaign fronts, pinned bubblettes, bidirectional wiki, and Ava reports are first-class UI contracts",async()=>{
  const[page,css,manual,reports,schema]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/globals.css",import.meta.url),"utf8"),readFile(new URL("../app/FieldManual.tsx",import.meta.url),"utf8"),readFile(new URL("../app/ava/reports.ts",import.meta.url),"utf8"),readFile(new URL("../app/submission-schema.ts",import.meta.url),"utf8"),
  ]);
  for(const label of ["MAIN CAMPAIGN","DOMESTIC FRONT","COMMAND NETWORK"])assert.match(page,new RegExp(label));
  assert.match(schema,/DOMESTIC_SUB_MISSIONS/);assert.match(schema,/NETWORK_SUB_MISSIONS/);assert.match(schema,/sub-missions-v3/);assert.match(schema,/SUB_MISSION_CONTENT_VERSION/);
  assert.match(css,/\.bubblette\.pinned>/);assert.match(css,/min-height:0!important/);
  assert.match(manual,/Depends on/);assert.match(manual,/Used by/);assert.match(manual,/usedBy/);
  assert.match(page,/AvaReportView/);assert.match(reports,/what should I do/);assert.match(reports,/report losses over the last 5 days/);
});

test("dashboard uses plain operational headings and the established minimum type size",async()=>{
  const[page,css,account]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
    readFile(new URL("../app/AccountPage.tsx",import.meta.url),"utf8"),
  ]);
  for(const heading of ["Live Expenditure","Production Capacity","Industrial Throughput","Systemic Attrition"]){
    assert.match(page,new RegExp(`title="${heading}"`));
  }
  assert.doesNotMatch(page,/Tempus Fugit|Praedicat Imperator|Industria Tabula|Consumere Ratio/);
  assert.doesNotMatch(css,/(?:font-size|font):[^;}]*\b6px\b/);
  assert.doesNotMatch(account,/campaign-editor|UPLOAD CAMPAIGN|IMPORT CAMPAIGN|CAMPAIGN EDITOR/i);
});

test("social metagame keeps power separate and issues portable campaign records",async()=>{
  const[account,setup,records,recordPage]=await Promise.all([
    readFile(new URL("../app/AccountPage.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/CampaignSetup.tsx",import.meta.url),"utf8"),
    readFile(new URL("../db/campaign-records.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/record/[slug]/page.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(account,/Service Record/);
  assert.match(account,/Existing players and newly registered players count identically/);
  assert.match(records,/FRIEND_BONUS_PER_CONNECTION=5/);
  assert.match(records,/FRIEND_BONUS_CAP=10/);
  assert.match(records,/friendMultiplier/);
  assert.match(recordPage,/CAMPAIGN COMMAND CERTIFICATE/);
  assert.match(recordPage,/decisionComparisons/);
  assert.match(recordPage,/SIMULATION ACCOMPLISHMENT/);
  assert.doesNotMatch(setup,/Select the state|THEATER <a|STATE ARCHETYPE|ADVERSARY SYSTEM|campaign-config-tree/i);
});
