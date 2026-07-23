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
  assert.match(packet,/operationalObjectiveForProblemClass\(situation\.problemClass\)/);
  assert.doesNotMatch(packet,/situation\.problemClass\.replaceAll/);
  assert.match(packet,/label:"FRONTAGE"/);
  assert.doesNotMatch(packet,/label="FRONTAGE"/);
  assert.doesNotMatch(packet,/AUTHORIZED MANEUVERS|CONNECTED SYSTEMS/);
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

test("menu hierarchy, secondary-front cooldown, and manual day resolution remain explicit",async()=>{
  const[page,briefing,game,styles]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
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
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/convergence.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  assert.match(page,/interfaceMode\s*===\s*\"briefing\"/);
  assert.match(page,/executeAvaPlan/);
  assert.match(page,/buildAvaPlan/);
  assert.match(page,/ALT UX/);
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
  assert.match(page,/resolveDay=\{advance\}/);
  assert.doesNotMatch(page,/resolveDay=\{\(\)=>setDayModal\(true\)\}/);
  assert.match(css,/\.briefing-ui/);
});

test("campaign fronts, pinned bubblettes, bidirectional wiki, and Ava reports are first-class UI contracts",async()=>{
  const[page,css,manual,reports,schema,bubblette,avaRenderer,briefing]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/globals.css",import.meta.url),"utf8"),readFile(new URL("../app/FieldManual.tsx",import.meta.url),"utf8"),readFile(new URL("../app/ava/reports.ts",import.meta.url),"utf8"),readFile(new URL("../app/submission-schema.ts",import.meta.url),"utf8"),readFile(new URL("../app/Bubblette.tsx",import.meta.url),"utf8"),readFile(new URL("../app/AvaTextRenderer.tsx",import.meta.url),"utf8"),readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
  ]);
  for(const label of ["MAIN CAMPAIGN","DOMESTIC FRONT","COMMAND NETWORK"])assert.match(page,new RegExp(label));
  assert.match(schema,/DOMESTIC_SUB_MISSIONS/);assert.match(schema,/NETWORK_SUB_MISSIONS/);assert.match(schema,/sub-missions-v3/);assert.match(schema,/SUB_MISSION_CONTENT_VERSION/);
  assert.match(page,/SubMissionReadout/);assert.match(page,/NETWORK POSTURE/);assert.match(page,/STRIKE RISK/);
  assert.match(css,/\.bubblette\.pinned\s*>\s*\.bubblette-panel/);assert.match(css,/min-height:\s*0\s*!important/);
  assert.match(css,/position:\s*fixed/);assert.match(css,/translate\(-50%,\s*-50%\)/);
  assert.ok(css.lastIndexOf("Final semantic cascade guard")>css.lastIndexOf("Shared pinned inspection graph"),"the pale content and type authority must be the final cascade block");
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
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  const situationCard=page.slice(page.indexOf("function SituationCard"),page.indexOf("function LiveLedger"));
  const campaign=page.slice(page.indexOf("function CampaignPage"),page.indexOf("function DoctrineConfirm"));
  const narrative=page.slice(page.indexOf("function SituationNarrative"),page.indexOf("function SituationCard"));
  assert.match(page,/function SituationNarrative/);
  assert.match(situationCard,/<SituationNarrative situation=\{situation\} \/>/);
  assert.match(campaign,/className="menu-inspector maneuver-detail campaign-empty-state"/);
  assert.match(campaign,/className="situation-card campaign-empty-card"/);
  assert.match(campaign,/data-overprint=\{situation\.sector\.toUpperCase\(\)\}/);
  assert.match(campaign,/showIntro \? \(/);
  assert.match(campaign,/setShowIntro\(false\)/);
  assert.match(campaign,/setInspectorSelection\(\{ kind: "main", id: maneuver\.id \}\)/);
  assert.match(campaign,/setInspectorSelection\(\{ kind: "sub", id: option\.id \}\)/);
  assert.doesNotMatch(campaign,/current\?\.id === maneuver\.id \? null : maneuver/);
  assert.doesNotMatch(campaign,/value === option\.id \? null : option\.id/);
  for(const field of ["situation.quote","situation.attribution","situation.headline","situation.briefing","situation.terrain","situation.ground","situation.network","situation.supply","situation.intelligence"]){
    assert.match(narrative,new RegExp(field.replaceAll(".","\\.")));
  }
  for(const field of ["situation.sector","situation.windowHours","situation.question"])
    assert.match(campaign,new RegExp(field.replaceAll(".","\\.")));
  assert.doesNotMatch(situationCard,/COMMANDER(?:&apos;|’|'|\\u2019)S QUESTION/i);
  assert.doesNotMatch(campaign,/COMMANDER(?:&apos;|’|'|\\u2019)S QUESTION/i);
  assert.match(campaign,/No maneuver has been issued\. The standing operational[\s\S]*tempo will prosecute the day by default\./);
  assert.doesNotMatch(campaign,/Select a front on the left/);
  assert.match(css,/\.campaign-empty-card\s*\{[\s\S]*?background:\s*#151612[\s\S]*?grid-template-columns:\s*82px minmax\(0,\s*1fr\) 270px[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\) auto auto auto/);
  assert.match(css,/\.campaign-empty-card:before\s*\{[\s\S]*?color:\s*#d83b274d/);
  assert.match(css,/\.campaign-empty-state \.situation-index\s*\{[\s\S]*?background:\s*#151612/);
  assert.match(css,/\.campaign-empty-state \.campaign-intro-order\s*\{[\s\S]*?background:\s*var\(--red\)/);
  assert.match(css,/\.campaign-empty-state \.situation-body h2\s*\{[\s\S]*?grid-row:\s*2/);
  assert.match(css,/\.campaign-empty-state \.campaign-intro-order > h3\s*\{[\s\S]*?grid-row:\s*2/);
});

test("campaign navigation, military reinforcement, Doctrine inspection, and text roles remain player-facing",async()=>{
  const[page,briefing,bubblette,css,concepts,terminal,voice,avaRenderer]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/Bubblette.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
    readFile(new URL("../app/concepts.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/ava/terminal.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/ava/voice.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/AvaTextRenderer.tsx",import.meta.url),"utf8"),
  ]);
  const readout=page.slice(page.indexOf("function SubMissionReadout"),page.indexOf("function DoctrineConfirm"));
  const campaign=page.slice(page.indexOf("function CampaignPage"),page.indexOf("function DoctrineConfirm"));
  assert.doesNotMatch(campaign,/campaign-mission-context|OPERATIONAL CONVERGENCE|MISSION TICKET|CONTENT FRAME|matrixVersion|frameId|realizationId|mechanical archetype/i);
  assert.match(readout,/FRONT-LINE CONSEQUENCE/);
  assert.match(readout,/WHY THIS ORDER EXISTS TODAY/);
  for(const label of ["EFFECTIVE GRADUATES","FIELD-EQUIPPED GRADUATES","HELD IN REPLACEMENT RESERVE","FIELD-READY SHARE","DEPLOYABLE REINFORCEMENTS"])assert.match(page,new RegExp(label));
  assert.doesNotMatch(concepts,/equipment assignment → reserve or deployable formation/i);
  assert.match(page,/BATTLEFIELD EFFECT/);assert.doesNotMatch(page,/DETERMINISTIC EFFECT/);
  assert.doesNotMatch(briefing,/EXACT RUNTIME EFFECT/);assert.match(briefing,/BATTLEFIELD EFFECT/);
  const doctrineSurface=briefing.slice(briefing.indexOf("function DoctrineSurface"),briefing.indexOf("function ManualSurface"));
  assert.doesNotMatch(page,/\sdisabled=\{!prior\}/);assert.doesNotMatch(doctrineSurface,/\sdisabled=\{!available\}/);
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
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
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
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
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
  assert.match(page,/Current \/ Desired/);
  assert.match(page,/EQUILIBRIUM/);
});

test("dashboard owns strategic reporting while command modules preserve the paper UI and route reports to Ava",async()=>{
  const[page,css,account,briefing]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
    readFile(new URL("../app/AccountPage.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
  ]);
  for(const heading of ["Live Expenditure","Production Capacity","Industrial Throughput","Systemic Attrition"]){
    assert.match(page,new RegExp(`title="${heading}"`));
  }
  const dashboard=page.slice(page.indexOf("function Dashboard"),page.indexOf("function ProductionCircuit"));
  const modulePage=page.slice(page.indexOf("function ModulePage"),page.indexOf("function WikiPage"));
  assert.match(dashboard,/"Industrial Condition"/);
  assert.doesNotMatch(dashboard,/className=\{`production-health/);
  assert.match(modulePage,/data-report-owner="ava"/);
  assert.match(modulePage,/className="module desktop-module"/);
  assert.match(modulePage,/className=\{`os-window \$\{isProduction \? "production-command-window" : ""\}`\}/);
  assert.match(modulePage,/className="tree-menu/);
  assert.match(modulePage,/\{isProduction \? "SET PRODUCTION TARGET" : "DIRECTIVE CONTROL PANEL"\}/);
  assert.match(modulePage,/className=\{`menu-inspector \$\{isProduction \? "production-target-inspector" : ""\}`\}/);
  assert.match(modulePage,/\{!isProduction && \(/);
  assert.match(modulePage,/className="menu-choice-list expanded single-surface"/);
  assert.match(modulePage,/className=\{directiveEffectTone\(x\)\}/);
  assert.match(modulePage,/<small>TRADEOFF<\/small>/);
  assert.doesNotMatch(modulePage,/module-report|ProductionCircuit|ForceGenerationCircuit|DomesticStatePanel|DiplomacyPanel|desertion-control/);
  assert.match(css,/\.production-command-window \.production-target-inspector\s*\{[\s\S]*?padding:\s*8px 32px 28px/);
  assert.match(css,/\.production-command-window[\s\S]*?\.production-target-inspector[\s\S]*?> \.menu-choice-list\s*\{[\s\S]*?margin:\s*0/);
  const sharedDirective=briefing.slice(briefing.indexOf("export function DirectiveSurface"),briefing.indexOf("function DoctrineSurface"));
  assert.match(sharedDirective,/Reports, forecasts, active effects, and historical ledgers are\s+available through Ava/);
  assert.doesNotMatch(sharedDirective,/NATIVE ALT UX SURFACE/);
  assert.doesNotMatch(briefing,/availableManeuvers\.slice/);
  assert.doesNotMatch(page,/Tempus Fugit|Praedicat Imperator|Industria Tabula|Consumere Ratio/);
  assert.doesNotMatch(css,/(?:font-size|font):[^;}]*\b6px\b/);
  assert.doesNotMatch(account,/campaign-editor|UPLOAD CAMPAIGN|IMPORT CAMPAIGN|CAMPAIGN EDITOR/i);
});

test("every command module opens with one canonical conceptual epigraph",async()=>{
  const[epigraphs,page,briefing,css]=await Promise.all([
    readFile(new URL("../app/module-epigraphs.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/BriefingInterface.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  for(const moduleKey of ["campaign","production","military","diplomacy","doctrine"]){
    assert.match(epigraphs,new RegExp(`\\b${moduleKey}:\\s*\\{`));
  }
  for(const line of [
    "The map is where every other ledger comes to collect.",
    "Production is the rate at which destruction stops being final.",
    "A formation exists only while people, equipment, and orders arrive together.",
    "Between states, every necessity becomes leverage.",
    "A doctrine is born when a battlefield mistake becomes too useful to condemn.",
  ])assert.equal((epigraphs.match(new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))??[]).length,1);
  const doctrine=page.slice(page.indexOf("function DoctrineControlPanel"),page.indexOf("function Term"));
  const shared=page.slice(page.indexOf("function ModulePage"),page.indexOf("function WikiPage"));
  const campaign=page.slice(page.indexOf("function CampaignPage"),page.indexOf("function DoctrineConfirm"));
  const directives=briefing.slice(briefing.indexOf("function DirectiveSurface"),briefing.indexOf("function DoctrineSurface"));
  const altDoctrine=briefing.slice(briefing.indexOf("function DoctrineSurface"),briefing.indexOf("function ManualSurface"));
  const altCampaign=briefing.slice(briefing.indexOf("function DailySurface"),briefing.indexOf("export function BriefingInterface"));
  assert.match(doctrine,/quote=\{MODULE_EPIGRAPHS\.doctrine\.quote\}/);
  assert.ok(doctrine.indexOf("<Epigraph")<doctrine.indexOf('<span className="eyebrow">'));
  assert.match(shared,/quote=\{epigraph\.quote\}/);
  assert.ok(shared.indexOf("<Epigraph")<shared.indexOf('<span className="eyebrow">'));
  assert.match(campaign,/quote=\{MODULE_EPIGRAPHS\.campaign\.quote\}/);
  assert.ok(campaign.indexOf("<Epigraph")<campaign.indexOf('<span className="eyebrow">'));
  assert.match(directives,/module === "national" \? "production" : module/);
  assert.ok(directives.indexOf("<ModernModuleEpigraph")<directives.indexOf("<span>{moduleLabel}"));
  assert.ok(altDoctrine.indexOf('<ModernModuleEpigraph module="doctrine" />')<altDoctrine.indexOf("<span>DOCTRINE"));
  assert.ok(altCampaign.indexOf('<ModernModuleEpigraph module="campaign" />')<altCampaign.indexOf('<section className="briefing-situation">'));
  assert.doesNotMatch(altCampaign,/MODULE_EPIGRAPHS\.campaign\.(?:quote|source)/);
  assert.match(css,/\.modern-module-epigraph\s*\{[\s\S]*?font:\s*italic 15px\/1\.55 var\(--serif\)/);
  assert.match(css,/\.modern-module-epigraph cite\s*\{[\s\S]*?font:\s*normal 9\.5px var\(--mono\)/);
});

test("social metagame uses private aliases, Player Rating, and portable campaign records",async()=>{
  const[account,setup,records,recordPage]=await Promise.all([
    readFile(new URL("../app/AccountPage.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/CampaignSetup.tsx",import.meta.url),"utf8"),
    readFile(new URL("../db/campaign-records.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/record/[slug]/page.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(account,/Service Record/);
  assert.match(account,/PLAYER RATING/);
  assert.match(account,/Only player aliases appear here/);
  assert.doesNotMatch(account,/friend\.email|friend\.displayName/);
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
