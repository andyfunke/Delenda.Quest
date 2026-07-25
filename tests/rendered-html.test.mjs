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

  const signedOutGame = await worker.fetch(
    new Request("http://localhost/game?account=1", {
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
  assert.equal(signedOutGame.status, 307);
  assert.equal(
    signedOutGame.headers.get("location"),
    "http://localhost/signin-with-chatgpt?return_to=%2Fgame%3Faccount%3D1",
  );

  const signedOutAdmin = await worker.fetch(
    new Request("http://localhost/admin", {
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
  assert.equal(signedOutAdmin.status, 307);
  assert.equal(
    signedOutAdmin.headers.get("location"),
    "http://localhost/signin-with-chatgpt?return_to=%2Fadmin",
  );

  const signedOutCampaign = await worker.fetch(
    new Request("http://localhost/api/campaign"),
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
  assert.equal(signedOutCampaign.status, 401);
});

test("landing page owns the default route and preserves the campaign entry surfaces", async () => {
  const [landing, gameRoute, redirect, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LandingRedirect.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(landing, /export default function LandingPage/);
  assert.match(landing, /className="landing-page"/);
  assert.match(landing, /STRATEGIC EPIGRAPH CANON \/\/ QUOTE BOARD/);
  assert.match(landing, /href="\/game"/);
  assert.match(landing, /href="\/game\?wiki=resolution&standalone=1"/);
  assert.match(landing, /href="\/game\?account=1"/);
  assert.match(
    landing,
    /Human authored content with a procedural generation engine\.\s*Original quotations and flavor text produce a thematic aesthetic\./,
  );
  assert.equal(
    (
      landing.match(
        /The commander studies the map\. The machine studies the commander\./g,
      ) ?? []
    ).length,
    1,
  );
  assert.doesNotMatch(
    landing.match(/const landingQuoteIds[\s\S]*?;/)?.[0] ?? "",
    /Q078|Q117/,
  );
  assert.match(
    landing.match(/const landingQuoteIds[\s\S]*?;/)?.[0] ?? "",
    /Q016/,
  );
  assert.match(
    landing.match(/const landingQuoteIds[\s\S]*?;/)?.[0] ?? "",
    /Q030/,
  );
  assert.match(
    landing,
    /She does not operate\s*through natural language\.\s*Programmatically enhanced command\s*recognition/,
  );
  assert.doesNotMatch(
    landing,
    /Order of Battle|Three inheritances\.\s*One front|Recovered from the mud|\bdead\b/i,
  );
  assert.match(gameRoute, /import GameClient from "\.\.\/GameClient"/);
  assert.match(gameRoute, /export const dynamic = "force-dynamic"/);
  assert.match(gameRoute, /requireChatGPTUser\(returnTo\)/);
  assert.match(redirect, /window\.location\.replace\(`\/game/);
  for (const token of [
    "--b-bg: #0c0e0d",
    "--b-panel: #131614",
    "--b-line: #2a302b",
    "--b-amber: #e0a458",
    "--b-red: #c9524a",
    "--b-green: #7ba05b",
    "--b-cyan: #6fb3b8",
  ])
    assert.match(styles, new RegExp(token));
  assert.match(styles, /\.landing-quote-grid/);
});

test("campaign UI is consequence-only while Ava retains the campaign report", async () => {
  const [page,packet,dispatch]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/OperationsPacket.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/war-dispatch.ts",import.meta.url),"utf8"),
  ]);
  const campaign=page.slice(page.indexOf("function CampaignPage"),page.indexOf("function DoctrineConfirm"));
  assert.match(page,/ISSUE ORDER →/);
  assert.doesNotMatch(campaign,/<section className="module-report">/);
  assert.doesNotMatch(campaign,/<CampaignReadout|<SubMissionReadout/);
  assert.match(campaign,/Immediate consequence/);
  assert.match(campaign,/What follows/);
  assert.match(campaign,/What this risks/);
  assert.match(campaign,/qualitativeConsequence\(line\)/);
  assert.doesNotMatch(campaign,/Owned effects|War effects|CAMPAIGN ESTIMATE|EXECUTION CONFIDENCE|EFFECTIVE FORCE RATIO/i);
  assert.doesNotMatch(campaign,/Math\.round\(explainManeuverChance/);
  assert.doesNotMatch(page,/ISSUE OPERATIONAL ORDER|SHOW FULL CALCULATION|SHOW PRESSURE CALCULUS/i);
  assert.match(packet,/label="ENEMY DEPLOYED"/);
  assert.match(packet,/label="EFFECTIVE FORCE RATIO"/);
  assert.match(packet,/operationalObjectiveForProblemClass\(situation\.problemClass\)/);
  assert.doesNotMatch(packet,/situation\.problemClass\.replaceAll/);
  assert.match(packet,/label:"FRONTAGE"/);
  assert.doesNotMatch(packet,/label="FRONTAGE"/);
  assert.doesNotMatch(packet,/AUTHORIZED MANEUVERS|CONNECTED SYSTEMS/);
  for(const id of ["terrain-conversion","ground-condition","command-network","operational-supply","intelligence"]){
    assert.match(packet,new RegExp(`id:"${id}"`));
  }
  assert.match(dispatch,/the plan lost integrity under concentrated fire/);
  assert.doesNotMatch(dispatch,/\$\{maneuverLabel\} came apart under concentrated fire/);
});

test("Campaign order language and daily aphorisms consume campaign-day rotating state",async()=>{
  const[page,game,substrate,rotation]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/game.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/campaign-substrate.ts",import.meta.url),"utf8"),
    readFile(new URL("../db/rotation.ts",import.meta.url),"utf8"),
  ]);
  assert.match(substrate,/maneuverPresentations:Record<string,ManeuverPresentation>/);
  assert.match(substrate,/compileManeuverPresentations/);
  assert.match(substrate,/MANEUVER_ORDER_GRAMMAR/);
  assert.match(game,/maneuversForState/);
  assert.match(page,/const options = maneuversForState\(s\)/);
  assert.match(page,/campaignAphorismDayKey\(runToken,\s*s\.day\)/);
  assert.match(page,/campaignAphorismDayKey\(runToken,\s*s\.day\s*-\s*1\)/);
  assert.doesNotMatch(page,/setActiveAphorismDay|aphorismDayKey\(now|millisecondsUntilNextLocalDay/);
  assert.match(page,/\},\s*\[activeAphorismDay,\s*previousAphorismDay\]\);/);
  assert.match(page,/dailyAphorismAssignment\?\.dayKey === activeAphorismDay/);
  assert.match(rotation,/const update=input\.context[\s\S]*?\? \{status:input\.status,context:input\.context,updatedAt:now\}[\s\S]*?: \{status:input\.status,updatedAt:now\}/);
});

test("diplomacy separates foreign actors from diplomatic actions",async()=>{
  const[page,panel]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/DiplomacyPanel.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(page,/FOREIGN ACTORS/);
  assert.match(page,/diplomacy-command-rail/);
  assert.match(page,/directive-family-menu/);
  assert.match(panel,/SELECTED FOREIGN ACTOR/);
  assert.doesNotMatch(panel,/<nav>/);
});

test("menu hierarchy, secondary-front cooldown, and manual day resolution remain explicit",async()=>{
  const[page,briefing,game,styles]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/game.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  for(const label of ["Allocate War Expenditure","Manage Operational Reserves","Administer Rotation and Recovery"])assert.match(game,new RegExp(label));
  for(const category of ["Access and Exchange","Influence and Coercion","Commitments and Alliances"])assert.match(game,new RegExp(category,"g"));
  assert.match(page,/convergenceFrontStatus/);assert.match(page,/cooling-option/);assert.match(page,/FRONT COOLING \/\/ INSPECT ONLY/);
  assert.match(briefing,/const unavailable = !convergenceOptionAvailable/);assert.match(briefing,/disabled=\{unavailable\}/);
  assert.match(styles,/\.campaign-submenu\.cooling/);assert.match(styles,/\.briefing-secondary-ledger/);
  assert.doesNotMatch(page,/completion-stamp|DAY&apos;S ORDERS ISSUED/);
  assert.match(page,/DAY \$\{next\.day\} REMAINS OPEN \/\/ RESOLVE MANUALLY/);
  assert.match(page,/GRADUATE ASSIGNMENT/);assert.match(page,/FIELD-READY SHARE/);
  assert.match(page,/ALL OTHER EFFECTIVE GRADUATES ENTER THE REPLACEMENT RESERVE/);
  assert.doesNotMatch(page,/ASSIGNMENT GATE|GRADUATES REMAIN PEOPLE/);
  assert.match(styles,/\.force-human-flow\s*\{[^}]*border-bottom:\s*6px solid #fff/s);
});

test("Alt UX is a second renderer over the same convergence substrate",async()=>{
  const[page,briefing,convergence,css]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/convergence.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  assert.match(page,/interfaceMode\s*===\s*\"briefing\"/);
  assert.match(page,/useState<\"command\" \| \"briefing\">\(\s*\"briefing\"/);
  assert.match(page,/<WarTicker \/>/);
  assert.doesNotMatch(page,/daily-aphorism-ribbon/);
  assert.match(page,/executeAvaPlan/);
  assert.match(page,/buildAvaPlan/);
  assert.match(page,/className="command-ux-toggle"/);
  assert.match(page,/>[\s\n]*SWITCH UX[\s\n]*<\/button>/);
  assert.match(briefing,/className="briefing-ux-toggle"/);
  assert.match(briefing,/className="briefing-top-actions"/);
  assert.match(briefing,/briefing-account-menu/);
  assert.match(briefing,/>[\s\n]*SETTINGS[\s\n]*<\/button>/);
  assert.match(briefing,/>[\s\n]*LOG OUT[\s\n]*<\/a>/);
  for(const domain of ["PRIMARY · MAIN CAMPAIGN","DOMESTIC FRONT","COMMAND NETWORK"]){
    assert.match(briefing,new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  }
  assert.doesNotMatch(briefing,/REFERENCE TACTICAL PLATE/);
  assert.match(convergence,/CONVERGENCE_MATRIX_VERSION=SUB_MISSION_SCHEMA_VERSION/);
  assert.match(briefing,/TheaterGeometry/);
  assert.doesNotMatch(briefing,/openModule/);
  assert.doesNotMatch(briefing,/openManual/);
  assert.match(briefing,/modern-dialog-scrim/);
  assert.match(briefing,/focusFamilyId/);
  assert.match(briefing,/onSurfaceChange/);
  assert.match(briefing,/briefing-open-manual/);
  const dailySurface=briefing.slice(
    briefing.indexOf("function DailySurface"),
    briefing.indexOf("const surfaceFor"),
  );
  const altInterface=briefing.slice(
    briefing.indexOf("export function BriefingInterface"),
  );
  const nav=altInterface.slice(
    altInterface.indexOf("const nav:"),
    altInterface.indexOf("const chooseSurface"),
  );
  assert.doesNotMatch(nav,/\["state",\s*"STATE"\]/);
  for(const label of [
    "DAILY BRIEF",
    "DAILY CAMPAIGN",
    "PRODUCTION",
    "MILITARY",
    "DIPLOMACY",
    "DOCTRINE",
    "FIELD MANUAL",
    "SERVICE RECORD",
  ])assert.match(nav,new RegExp(`"${label}"`));
  assert.ok(nav.indexOf('"DAILY CAMPAIGN"')<nav.indexOf('"DAILY BRIEF"'));
  assert.match(dailySurface,/className="modern-surface modern-daily-surface"/);
  assert.match(dailySurface,/<small>FORWARD DEPLOYED<\/small>/);
  assert.match(dailySurface,/\{fmt\(operation\.committed, true\)\}/);
  assert.doesNotMatch(dailySurface,/briefing-footer/);
  assert.equal((altInterface.match(/className="briefing-footer"/g)??[]).length,1);
  assert.ok(
    altInterface.indexOf('className="briefing-footer"')>
      altInterface.indexOf('surface === "manual"'),
  );
  assert.match(altInterface,/window\.addEventListener\("briefing-request-resolve", requestResolve\)/);
  assert.match(altInterface,/disabled=\{!canResolve\}[\s\S]{0,100}onClick=\{requestResolve\}/);
  assert.match(page,/resolveDay=\{advance\}/);
  assert.doesNotMatch(page,/resolveDay=\{\(\)=>setDayModal\(true\)\}/);
  assert.match(css,/\.briefing-ui/);
  assert.match(briefing,/function DailyBriefSurface/);
  assert.match(briefing,/latest\.epigraph \?\?/);
  assert.match(briefing,/COMM\. HET CLAXTON, Praetor Corps, Third Division/);
  assert.match(css,/\.alt-daily-brief > blockquote/);
  assert.match(page,/<main className=\{interfaceMode === "briefing" \? "briefing-main" : undefined\}>/);
  assert.match(css,/\.briefing-main\s*\{[^}]*background:\s*#0c0e0d;[^}]*padding-bottom:\s*0;/s);
  const secondaryFrontRules=[...css.matchAll(/\.briefing-secondary-fronts\s*\{([^}]*)\}/g)].map((match)=>match[1]);
  assert.ok(secondaryFrontRules.length>0);
  assert.ok(secondaryFrontRules.some((rule)=>/grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(rule)));
  secondaryFrontRules.forEach((rule)=>assert.doesNotMatch(rule,/1fr 1fr/));
  assert.doesNotMatch(briefing,/COMMAND CHANNEL/);
  assert.match(css,/@keyframes ava-alt-attention/);
  assert.match(css,/@keyframes ava-main-attention/);
});

test("signed-in account turnover is daily by default and Ava can explicitly toggle godmode",async()=>{
  const[page,gameRoute,turnRoute,turnStore,schema]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/game/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/api/turn/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../db/turns.ts",import.meta.url),"utf8"),
    readFile(new URL("../db/schema.ts",import.meta.url),"utf8"),
  ]);
  assert.match(gameRoute,/requireChatGPTUser/);
  assert.match(schema,/accountTurnState=sqliteTable\("account_turn_state"/);
  assert.match(turnRoute,/claimDailyResolution/);
  assert.match(turnRoute,/setGodMode/);
  assert.match(turnStore,/lastResolvedDayKey !== dayKey/);
  assert.match(turnStore,/ne\(accountTurnState\.lastResolvedDayKey, currentDayKey\)/);
  assert.match(page,/godModeCommand === "enable godmode"/);
  assert.match(page,/godModeCommand === "disable godmode"/);
  assert.match(page,/GODMODE ENABLED\\nActual-time daily turnover is disabled/);
  assert.match(page,/GODMODE DISABLED\\nActual-time daily turnover is restored/);
  assert.match(page,/void advance\("automatic"\)/);
  assert.match(page,/DAILY TURN ALREADY USED/);
});

test("campaign fronts, pinned bubblettes, bidirectional wiki, and Ava reports are first-class UI contracts",async()=>{
  const[page,css,manual,reports,schema,bubblette,avaRenderer,briefing]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),readFile(new URL("../app/globals.css",import.meta.url),"utf8"),readFile(new URL("../app/FieldManual.tsx",import.meta.url),"utf8"),readFile(new URL("../app/ava/reports.ts",import.meta.url),"utf8"),readFile(new URL("../app/submission-schema.ts",import.meta.url),"utf8"),readFile(new URL("../app/Bubblette.tsx",import.meta.url),"utf8"),readFile(new URL("../app/AvaTextRenderer.tsx",import.meta.url),"utf8"),readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
  ]);
  for(const label of ["MAIN CAMPAIGN","DOMESTIC FRONT","COMMAND NETWORK"])assert.match(page,new RegExp(label));
  assert.match(schema,/DOMESTIC_SUB_MISSIONS/);assert.match(schema,/NETWORK_SUB_MISSIONS/);assert.match(schema,/sub-missions-v3/);assert.match(schema,/SUB_MISSION_CONTENT_VERSION/);
  const campaign=page.slice(page.indexOf("function CampaignPage"),page.indexOf("function DoctrineConfirm"));
  assert.doesNotMatch(campaign,/<SubMissionReadout/);
  assert.match(reports,/STRIKE RISK/);
  assert.match(reports,/sector network condition \+ network posture/);
  assert.match(css,/\.bubblette\.pinned\s*>\s*\.bubblette-panel/);assert.match(css,/min-height:\s*0\s*!important/);
  assert.match(css,/position:\s*fixed/);assert.match(css,/translate\(-50%,\s*-50%\)/);
  assert.ok(css.lastIndexOf("Definitive readability and terminal-type contract")>css.lastIndexOf("Shared pinned inspection graph"),"the definitive readability contract must follow legacy component rules");
  assert.ok(css.lastIndexOf("Global readability floor for frequently used command surfaces")>css.lastIndexOf("Campaign is a decision surface"),"the 12px player-facing floor must close the cascade");
  assert.match(css,/\.campaign-workspace \.campaign-consequences h3\s*\{[\s\S]{0,120}font-size:\s*12px/);
  assert.match(bubblette,/bubblette-scrim/);assert.match(bubblette,/FIELD_MANUAL_CATALOG/);assert.match(bubblette,/details\.slice\(0, 4\)/);
  assert.doesNotMatch(bubblette,/activeId|CONNECTED SYSTEMS|setActiveId/);
  assert.ok((bubblette.match(/openWikiApplet\(/g)??[]).length<=2,"only explicit detail and Field Manual actions may leave a bubblette");
  assert.match(manual,/Depends on/);assert.match(manual,/Used by/);assert.match(manual,/usedBy/);
  assert.match(page,/AvaTextRenderer/);assert.match(avaRenderer,/terminalBlocks/);assert.doesNotMatch(page,/AvaReportView/);
  assert.match(page,/submitAvaCommand\("help"\)/);assert.doesNotMatch(page,/avaHelp|AVA_COMMAND_HELP|className="ava-help"/);
  assert.match(page,/useState<Message\[\]>\(\[\]\)/);assert.match(reports,/what should I do/);assert.match(reports,/report losses over the last 5 days/);
  assert.doesNotMatch(page,/<details|<summary/);assert.doesNotMatch(briefing,/<details|<summary/);
});

test("campaign's one-time introduction uses the dashboard card grammar and cannot be reselected",async()=>{
  const[page,css]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  const situationCard=page.slice(page.indexOf("function SituationCard"),page.indexOf("function LiveLedger"));
  const campaign=page.slice(page.indexOf("function CampaignPage"),page.indexOf("function DoctrineConfirm"));
  const narrative=page.slice(page.indexOf("function SituationNarrative"),page.indexOf("function SituationCard"));
  assert.match(page,/function SituationNarrative/);
  assert.match(situationCard,/<SituationNarrative situation=\{situation\} \/>/);
  assert.match(campaign,/className="menu-inspector maneuver-detail campaign-empty-state"/);
  assert.match(campaign,/className="situation-card campaign-empty-card"/);
  assert.doesNotMatch(campaign,/data-overprint=/);
  assert.match(campaign,/className="situation-index campaign-intro-index"[\s\S]*?aria-hidden="true"/);
  assert.match(campaign,/className="campaign-sector-lane"[\s\S]*?data-sector=\{situation\.sector\}[\s\S]*?--campaign-sector-fit[\s\S]*?\{situation\.sector\}/);
  assert.doesNotMatch(campaign,/DAILY STRATEGIC SITUATION/);
  assert.doesNotMatch(campaign,/\{situation\.windowHours\} HOUR WINDOW/);
  assert.match(campaign,/showIntro \? \(/);
  assert.match(campaign,/setShowIntro\(false\)/);
  assert.match(campaign,/setInspectorSelection\(\{ kind: "main", id: maneuver\.id \}\)/);
  assert.match(campaign,/setInspectorSelection\(\{ kind: "sub", id: option\.id \}\)/);
  assert.doesNotMatch(campaign,/current\?\.id === maneuver\.id \? null : maneuver/);
  assert.doesNotMatch(campaign,/value === option\.id \? null : option\.id/);
  for(const field of ["situation.quote","situation.attribution","situation.headline","situation.briefing","situation.terrain","situation.ground","situation.network","situation.supply","situation.intelligence"]){
    assert.match(narrative,new RegExp(field.replaceAll(".","\\.")));
  }
  for(const field of ["situation.sector","situation.question"])
    assert.match(campaign,new RegExp(field.replaceAll(".","\\.")));
  assert.doesNotMatch(situationCard,/COMMANDER(?:&apos;|’|'|\\u2019)S QUESTION/i);
  assert.doesNotMatch(campaign,/COMMANDER(?:&apos;|’|'|\\u2019)S QUESTION/i);
  assert.match(campaign,/No maneuver has been issued\. The standing operational[\s\S]*tempo will prosecute the day by default\./);
  assert.doesNotMatch(campaign,/Select a front on the left/);
  assert.match(campaign,/preserveOperationalBlock/);
  assert.match(css,/\.campaign-empty-card\s*\{[\s\S]*?background:\s*#151612[\s\S]*?grid-template-columns:\s*82px minmax\(0,\s*1fr\) 270px[\s\S]*?grid-template-rows:\s*118px auto auto minmax\(0,\s*1fr\)/);
  assert.match(css,/\.campaign-empty-card:before\s*\{[\s\S]*?content:\s*none/);
  assert.match(css,/\.campaign-sector-lane\s*\{[\s\S]*?color:\s*rgb\(216 59 39 \/ 42%\)[\s\S]*?container-type:\s*inline-size[\s\S]*?grid-column:\s*2[\s\S]*?grid-row:\s*1[\s\S]*?padding:\s*16px 48px[\s\S]*?z-index:\s*3/);
  assert.match(css,/\.campaign-sector-lane > span\s*\{[\s\S]*?font-size:\s*clamp\(18px,\s*var\(--campaign-sector-fit\),\s*76px\)[\s\S]*?font-kerning:\s*normal[\s\S]*?letter-spacing:\s*0\.01em[\s\S]*?max-width:\s*100%/);
  assert.doesNotMatch(css,/\.campaign-sector-lane:after/);
  assert.match(css,/\.campaign-empty-state \.situation-index\s*\{[\s\S]*?background:\s*#151612/);
  assert.match(css,/\.campaign-empty-state \.campaign-intro-order\s*\{[\s\S]*?background:\s*var\(--red\)[\s\S]*?grid-row:\s*1 \/ -1/);
  assert.match(css,/\.campaign-operational-block\s*\{[\s\S]*?grid-row:\s*3/);
  assert.match(css,/\.campaign-empty-state \.campaign-intro-order > h3\s*\{[\s\S]*?grid-row:\s*3[\s\S]*?max-width:\s*100%/);
});

test("campaign navigation, military reinforcement, Doctrine inspection, and text roles remain player-facing",async()=>{
  const[page,briefing,bubblette,css,concepts,terminal,voice,avaRenderer]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/Bubblette.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
    readFile(new URL("../app/concepts.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/ava/terminal.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/ava/voice.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/AvaTextRenderer.tsx",import.meta.url),"utf8"),
  ]);
  const campaign=page.slice(page.indexOf("function CampaignPage"),page.indexOf("function DoctrineConfirm"));
  assert.doesNotMatch(campaign,/campaign-mission-context|OPERATIONAL CONVERGENCE|MISSION TICKET|CONTENT FRAME|matrixVersion|frameId|realizationId|mechanical archetype/i);
  assert.doesNotMatch(campaign,/FRONT-LINE CONSEQUENCE|WHY THIS ORDER EXISTS TODAY/);
  for(const label of ["EFFECTIVE GRADUATES","FIELD-EQUIPPED GRADUATES","HELD IN REPLACEMENT RESERVE","FIELD-READY SHARE","DEPLOYABLE REINFORCEMENTS"])assert.match(page,new RegExp(label));
  assert.doesNotMatch(concepts,/equipment assignment → reserve or deployable formation/i);
  assert.match(page,/BATTLEFIELD EFFECT/);assert.doesNotMatch(page,/DETERMINISTIC EFFECT/);
  assert.doesNotMatch(briefing,/EXACT RUNTIME EFFECT/);assert.match(briefing,/BATTLEFIELD EFFECT/);
  const doctrineSurface=briefing.slice(briefing.indexOf("function DoctrineSurface"),briefing.indexOf("function ManualSurface"));
  assert.doesNotMatch(page,/\sdisabled=\{!prior\}/);
  assert.doesNotMatch(doctrineSurface,/aria-disabled/);
  assert.match(bubblette,/bubblette-pinned/);assert.doesNotMatch(bubblette,/setActiveId|relatedId|CONNECTED SYSTEMS/);assert.match(bubblette,/FIELD APPLETTE \/\/ PINNED/);assert.match(bubblette,/FIELD_MANUAL_CATALOG/);
  assert.match(page,/if \(interfaceMode === "briefing"\)[\s\S]{0,180}briefing-open-manual/);
  assert.match(css,/background:\s*#fffde8/);assert.match(css,/--type-display/);assert.match(css,/--type-body:\s*400 18px/);assert.match(css,/--type-data/);
  assert.match(terminal,/voiceCueForInstruction/);assert.match(voice,/FIELD NOTE \/ \$\{opening\.label\}/);assert.doesNotMatch(voice,/responseTopic/);
  assert.match(avaRenderer,/explicitLoss/);assert.match(avaRenderer,/explicitGain/);assert.doesNotMatch(avaRenderer,/line\.includes\(["']\+["']\)|line\.includes\(["']−["']\)/);
});

test("bubblettes, Military hover geometry, and foreign actor choices preserve their information roles",async()=>{
  const[css,bubblette,packet]=await Promise.all([
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
    readFile(new URL("../app/Bubblette.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/OperationsPacket.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(css,/\.maneuver-detail\s*>\s*dl/);
  assert.match(css,/\.force-human-flow\s*\{[\s\S]*?overflow:\s*visible/);
  assert.match(css,/\.diplomacy-command-rail\s+\.foreign-actor-menu\s*\{\s*background:\s*#fff/);
  assert.match(css,/\.foreign-actor-menu[\s\S]*button:not\(\.tree-group-heading\)[\s\S]*background:\s*#fff/);
  assert.match(css,/\.bubblette-panel\s+dl\s*\{[\s\S]*?display:\s*block[\s\S]*?grid-template-columns:\s*none/);
  assert.match(bubblette,/CLICK TO PIN/);
  assert.doesNotMatch(packet,/AUTHORIZED MANEUVERS|CONNECTED SYSTEMS/);
});

test("the theater plate compiles deterministic 45/90 geometry and preserves the munitions stockpile label",async()=>{
  const[page,briefing,map]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/TheaterGeometry.tsx",import.meta.url),"utf8"),
  ]);
  for(const input of ["sector.control","sector.supplyAccess","sector.network","state.front","state.maneuver","state.situationHistory","state.operationalFacts","operation.committed","operation.frontageDemand"])assert.match(map,new RegExp(input.replace(".","\\.")));
  assert.match(map,/compileTheaterGeometry/);
  assert.match(map,/geometrySegmentsAreValid/);
  assert.match(map,/data-angle-contract="45-90-only"/);
  assert.match(map,/primitiveFor/);
  assert.doesNotMatch(map,/bezier|quadratic|curveTo/i);
  assert.match(map,/formation-arrow primary/);
  assert.match(map,/formation-arrow adjacent/);
  assert.match(map,/enemy-formation-arrow/);
  assert.match(map,/posture-\$\{geometry\.posture\}/);
  assert.match(map,/>\s*18th\s*</);
  assert.match(map,/ENEMY POSITION/);
  assert.doesNotMatch(map,/ENEMY FIRES|ACTIVE FRONTAGE|FRIENDLY \/ FORCE SURFACE|ENEMY PRESSURE/);
  assert.doesNotMatch(map,/ADVANTAGE PATH SURFACE|LOSS-EXPOSURE SURFACE|DESIGN HORIZON|INERT COMMAND COLLAPSE|GENERATED HORIZON|ANGLE CONTRACT/);
  assert.doesNotMatch(map,/COMMITTED \{|FRONTAGE \{|SURFACE \{/);
  assert.doesNotMatch(map,/className="briefing-map-legend"|className="geometry-calculus"|className="path-surfaces"/);
  assert.match(page,/<small>Stockpile<\/small>/);assert.match(briefing,/STOCKPILE/);
  assert.doesNotMatch(page,/Net expenditure/i);
});

test("opportunities interrupt without opening the decision menu and collapse into AVA's single urgent alert rail",async()=>{
  const[page,css,circuits]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
    readFile(new URL("../app/circuits.ts",import.meta.url),"utf8"),
  ]);
  assert.doesNotMatch(page,/if \(status === "opened"\) setOpportunityOpen\(true\)/);
  assert.match(page,/setOpportunityInterruptAcknowledged\(false\)/);
  assert.match(page,/role="alertdialog"/);
  assert.match(page,/className="interrupt-close"/);
  assert.match(page,/REVIEW OPTIONS →/);
  assert.match(page,/className="ava-urgent-icon"/);
  assert.match(page,/className="ava-alert-menu"/);
  assert.equal((page.match(/className="ava-urgent-icon"/g)??[]).length,1);
  assert.doesNotMatch(page,/className="early opportunity-alert"/);
  assert.match(css,/\.global-opportunity-interrupt[\s\S]*background:\s*#fff/);
  assert.match(css,/\.global-opportunity-interrupt \.interrupt-close[\s\S]*font:\s*900 48px/);
  for(const field of ["desiredOutput","requestedUse","fulfilledUse","unmetUse","equilibrium"])assert.match(circuits,new RegExp(field));
  for(const heading of ["Allocation","Production","Current","Required","Live Stock","Balance"])assert.match(page,new RegExp(`<span>${heading}<\\/span>`));
  assert.doesNotMatch(page,/Current \/ Desired/);
  assert.match(page,/<span>Desertions<\/span>[\s\S]{0,180}<small>Actual Net Flight Today<\/small>/);
  const liveLedger=page.slice(page.indexOf("function LiveLedger"),page.indexOf("function Dashboard"));
  assert.doesNotMatch(liveLedger,/Net Flight \{fmtStrategic|attempts ·/);
  const desertionInspector=page.slice(page.indexOf('{metric === "desertion"'),page.indexOf('<section className="factors">',page.indexOf('{metric === "desertion"')));
  assert.doesNotMatch(desertionInspector,/DESERTION PRESSURE|\/ 100/);
  assert.match(desertionInspector,/CAMPAIGN NET DESERTIONS/);
  assert.match(css,/\.prod-row\s*\{[\s\S]*grid-template-columns:[\s\S]*minmax\(78px,[\s\S]*minmax\(138px/);
  assert.match(css,/\.ava\s*\{[\s\S]*--type-body:\s*450 14px[\s\S]*--type-label:\s*750 12px/);
  assert.match(css,/\.ava,\s*\n\.ava \*,[\s\S]*font-family:\s*var\(--ui\)\s*!important/);
  assert.match(css,/\.ava-button > span,[\s\S]{0,220}\.ava > footer button\s*\{[\s\S]{0,80}font-size:\s*12px/);
});

test("the strategic dashboard remains a dormant stub while Daily Campaign owns game entry",async()=>{
  const[page,css,account,briefing]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
    readFile(new URL("../app/AccountPage.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
  ]);
  for(const heading of ["Live Expenditure","Production Capacity","Industrial Throughput","Systemic Attrition"]){
    assert.match(page,new RegExp(`title="${heading}"`));
  }
  const dashboard=page.slice(page.indexOf("function Dashboard"),page.indexOf("function ProductionCircuit"));
  const modulePage=page.slice(page.indexOf("function ModulePage"),page.indexOf("function WikiPage"));
  const playerModules=page.slice(page.indexOf("const modules:"),page.indexOf("const resourceLabel"));
  const surfaceRouter=briefing.slice(briefing.indexOf("const surfaceFor"),briefing.indexOf("export function BriefingInterface"));
  assert.doesNotMatch(playerModules,/id:\s*"dashboard"/);
  assert.match(page,/useState<Page>\("campaign"\)/);
  assert.match(page,/const priorTelemetryModule = useRef<Page>\("campaign"\)/);
  assert.match(page,/terminal\.navigate === "dashboard" \? "campaign"/);
  assert.match(surfaceRouter,/target === "dashboard"\s*\?\s*"brief"/);
  assert.doesNotMatch(surfaceRouter,/"state",/);
  assert.match(page,/className="logo"[\s\S]{0,120}href="\/"/);
  assert.match(briefing,/className="briefing-brand"[\s\S]{0,120}href="\/"/);
  assert.match(dashboard,/"Industrial Condition"/);
  assert.doesNotMatch(dashboard,/className=\{`production-health/);
  assert.match(modulePage,/data-report-owner="ava"/);
  assert.match(modulePage,/className="module desktop-module"/);
  assert.match(modulePage,/className=\{`os-window \$\{isProduction \? "production-command-window" : ""\}`\}/);
  assert.match(modulePage,/className="tree-menu/);
  assert.match(modulePage,/\{isProduction \? "SET PRODUCTION TARGET" : "DIRECTIVE CONTROL PANEL"\}/);
  assert.match(modulePage,/className=\{`menu-inspector directive-menu-inspector \$\{isProduction \? "production-target-inspector" : ""\}`\}/);
  assert.doesNotMatch(modulePage,/\{!isProduction && \(/);
  assert.match(modulePage,/className="menu-choice-list expanded single-surface"/);
  assert.match(modulePage,/className="selection-dossier directive-selection-dossier"/);
  assert.match(modulePage,/previewChoice\?\.label \?\? selectedFamily\.label/);
  assert.match(modulePage,/previewChoice\?\.flavor \?\? selectedFamily\.brief/);
  assert.match(modulePage,/className=\{directiveEffectTone\(x\)\}/);
  assert.match(modulePage,/<small>TRADEOFF<\/small>/);
  assert.doesNotMatch(modulePage,/module-report|ProductionCircuit|ForceGenerationCircuit|DomesticStatePanel|DiplomacyPanel|desertion-control/);
  assert.match(css,/\.production-command-window \.production-target-inspector\s*\{[\s\S]*?padding:\s*8px 32px 28px/);
  assert.match(css,/\.production-command-window[\s\S]*?\.production-target-inspector[\s\S]*?> \.menu-choice-list\s*\{[\s\S]*?margin:\s*0/);
  assert.match(css,/\.desktop-module \.directive-menu-inspector\s*\{[\s\S]*?padding:\s*8px 32px 28px/);
  assert.match(css,/\.desktop-module \.directive-glance h3\s*\{[\s\S]*?clamp\(24px/);
  assert.match(css,/\.campaign-workspace \.campaign-consequences h3\s*\{[\s\S]*?font-family:\s*var\(--ui\)[\s\S]*?font-size:\s*12pt/);
  assert.match(css,/\.campaign-workspace \.campaign-consequences li\s*\{[\s\S]*?font-family:\s*var\(--ui\)[\s\S]*?font-size:\s*12pt/);
  assert.match(page,/className="menu-inspector doctrine-inspector doctrine-empty-state"/);
  assert.match(page,/NO PRINCIPLE SELECTED/);
  assert.match(page,/className="selection-dossier doctrine-selection-dossier"/);
  const doctrinePanel=page.slice(page.indexOf("function DoctrineControlPanel"),page.indexOf("const initialArticles"));
  assert.doesNotMatch(doctrinePanel,/<section className="module-report">/);
  const sharedDirective=briefing.slice(briefing.indexOf("export function DirectiveSurface"),briefing.indexOf("function DoctrineSurface"));
  assert.match(sharedDirective,/Reports, forecasts, active effects, and historical ledgers are\s+available through Ava/);
  assert.doesNotMatch(sharedDirective,/NATIVE ALT UX SURFACE/);
  assert.doesNotMatch(briefing,/availableManeuvers\.slice/);
  assert.doesNotMatch(page,/Tempus Fugit|Praedicat Imperator|Industria Tabula|Consumere Ratio/);
  assert.doesNotMatch(css,/(?:font-size|font):[^;}]*\b6px\b/);
  assert.doesNotMatch(account,/campaign-editor|UPLOAD CAMPAIGN|IMPORT CAMPAIGN|CAMPAIGN EDITOR/i);
});

test("Ava archives, disclosed forecasts, and workbook calculus remain explicit infrastructure",async()=>{
  const[page,storage,workbook,projection,reports,setup]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/ava/storage.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/ava/workbook.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/ava/projection.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/ava/reports.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/CampaignSetup.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(storage,/objectStoreNames\.contains\(ARCHIVE_STORE\)/);
  assert.doesNotMatch(storage,/deleteObjectStore/);
  assert.doesNotMatch(storage,/\bhistory\b|\bmessages\b|rawInput|raw prompt/i);
  assert.match(storage,/deleteAvaShellArchive/);
  assert.match(page,/disabled=\{!avaArchiveHydrated\}/);
  assert.match(page,/maxLength=\{512\}/);
  assert.match(page,/SESSION-ONLY FILE \/\/ DOWNLOAD BEFORE RELOAD/);
  assert.match(setup,/Ava files are campaign-local/);
  for(const sheet of [
    "Industrial Throughput",
    "Calculation Inputs",
    "Force Generation",
    "Diplomatic Calculus",
    "Directive Calculus",
    "Doctrine Calculus",
    "Resolution History",
    "Campaign Score",
  ])assert.match(workbook,new RegExp(sheet));
  assert.match(projection,/readiness:\s*65/);
  assert.match(projection,/equipment:\s*65/);
  assert.match(projection,/adversaryLedger:\s*null/);
  assert.doesNotMatch(reports,/projectOperations|projectAdversary|estimateDay|projectDomestic/);
});

test("every command module renders the campaign-day aphorism as explicit state",async()=>{
  const[page,briefing,css]=await Promise.all([
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  const doctrine=page.slice(page.indexOf("function DoctrineControlPanel"),page.indexOf("function Term"));
  const shared=page.slice(page.indexOf("function ModulePage"),page.indexOf("function WikiPage"));
  const campaign=page.slice(page.indexOf("function CampaignPage"),page.indexOf("function DoctrineConfirm"));
  const directives=briefing.slice(briefing.indexOf("function DirectiveSurface"),briefing.indexOf("function DoctrineSurface"));
  const altDoctrine=briefing.slice(briefing.indexOf("function DoctrineSurface"),briefing.indexOf("function ManualSurface"));
  const altCampaign=briefing.slice(briefing.indexOf("function DailySurface"),briefing.indexOf("export function BriefingInterface"));
  assert.doesNotMatch(page,/MODULE_EPIGRAPHS|setDailyModuleEpigraph/);
  assert.doesNotMatch(briefing,/MODULE_EPIGRAPHS|setDailyModuleEpigraph/);
  assert.match(page,/<BriefingInterface[\s\S]*?epigraph=\{dailyAphorism\}/);
  assert.match(doctrine,/\{epigraph && <Epigraph quote=\{epigraph\.text\} source=\{epigraph\.source\} \/>\}/);
  assert.ok(doctrine.indexOf("<Epigraph")<doctrine.indexOf('<span className="eyebrow">'));
  assert.match(shared,/\{epigraph && <Epigraph quote=\{epigraph\.text\} source=\{epigraph\.source\} \/>\}/);
  assert.ok(shared.indexOf("<Epigraph")<shared.indexOf('<span className="eyebrow">'));
  assert.match(campaign,/\{epigraph && <Epigraph quote=\{epigraph\.text\} source=\{epigraph\.source\} \/>\}/);
  assert.ok(campaign.indexOf("<Epigraph")<campaign.indexOf('<span className="eyebrow">'));
  assert.match(directives,/<ModernModuleEpigraph epigraph=\{epigraph\} \/>/);
  assert.ok(directives.indexOf("<ModernModuleEpigraph")<directives.indexOf("<span>{moduleLabel}"));
  assert.ok(altDoctrine.indexOf('<ModernModuleEpigraph epigraph={epigraph} />')<altDoctrine.indexOf("<span>DOCTRINE"));
  assert.ok(altCampaign.indexOf('<ModernModuleEpigraph epigraph={epigraph} />')<altCampaign.indexOf('<section className="briefing-situation">'));
  assert.match(css,/\.modern-module-epigraph\s*\{[\s\S]*?font:\s*italic 15px\/1\.55 var\(--serif\)/);
  assert.match(css,/\.modern-module-epigraph cite\s*\{[\s\S]*?font:\s*normal 9\.5px var\(--mono\)/);
});

test("social metagame uses private aliases, private day boundaries, Player Rating, and portable campaign records",async()=>{
  const[account,setup,records,recordPage,admin]=await Promise.all([
    readFile(new URL("../app/AccountPage.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/CampaignSetup.tsx",import.meta.url),"utf8"),
    readFile(new URL("../db/campaign-records.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/record/[slug]/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../db/admin.ts",import.meta.url),"utf8"),
  ]);
  assert.match(account,/Service Record/);
  assert.match(account,/PLAYER RATING/);
  assert.match(account,/Only player aliases appear here/);
  assert.doesNotMatch(account,/friend\.email|friend\.displayName/);
  assert.match(account,/PRIVATE TIME ZONE/);
  assert.match(account,/setting is private and is not available to administration/);
  assert.doesNotMatch(admin,/users\.timeZone|timeZone:users/);
  assert.match(records,/FRIEND_BONUS_PER_CONNECTION=5/);
  assert.match(records,/FRIEND_BONUS_CAP=10/);
  assert.match(records,/friendMultiplier/);
  assert.match(records,/productionMin/);
  assert.match(records,/sufferedMin/);
  assert.match(records,/inflictedMin/);
  assert.match(records,/input\.multiplayer\?125:100/);
  assert.match(recordPage,/CAMPAIGN COMMAND CERTIFICATE/);
  assert.match(recordPage,/decisionComparisons/);
  assert.match(recordPage,/SIMULATION ACCOMPLISHMENT/);
  assert.doesNotMatch(setup,/Select the state|THEATER <a|STATE ARCHETYPE|ADVERSARY SYSTEM|campaign-config-tree/i);
});

test("registration owns active campaigns and the telemetry console is server-authorized",async()=>{
  const[gameRoute,client,campaignRoute,campaignStore,schema,adminRoute,adminStore,landing,telemetryRoute]=await Promise.all([
    readFile(new URL("../app/game/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/GameClient.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/api/campaign/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../db/campaigns.ts",import.meta.url),"utf8"),
    readFile(new URL("../db/schema.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/admin/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../db/admin.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/api/telemetry/route.ts",import.meta.url),"utf8"),
  ]);
  assert.match(gameRoute,/requireChatGPTUser\(returnTo\)/);
  assert.match(gameRoute,/ensureAccount\(user\)/);
  assert.match(schema,/activeCampaigns=sqliteTable\("active_campaigns"/);
  assert.match(schema,/ownerEmail:text\("owner_email"\)\.primaryKey\(\)/);
  assert.match(campaignRoute,/if\(!user\).*Sign in to load your campaign/s);
  assert.match(campaignRoute,/saveActiveCampaign\(user/);
  assert.match(campaignStore,/ownerEmail=await ensureAccount\(user\)/);
  assert.match(campaignStore,/target:activeCampaigns\.ownerEmail/);
  assert.doesNotMatch(campaignStore,/input\.ownerEmail/);
  assert.match(client,/fetch\("\/api\/campaign",\{cache:"no-store"\}\)/);
  assert.match(client,/method:"PUT"/);
  assert.match(client,/accountKey:campaignAccountKey\.current/);
  assert.match(adminRoute,/requireChatGPTUser\("\/admin"\)/);
  assert.match(adminRoute,/isAdmin\(user\)/);
  assert.match(adminRoute,/notFound\(\)/);
  assert.doesNotMatch(landing,/href="\/admin"/);
  assert.match(adminStore,/registeredPlayers/);
  assert.match(adminStore,/activeCampaigns:Number/);
  assert.match(adminStore,/telemetryEvents/);
  assert.match(telemetryRoute,/if\(!user\).*Sign in before recording campaign telemetry/s);
});
