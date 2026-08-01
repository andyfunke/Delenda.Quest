import { fmt, situationForState, type GameState } from "../game";
import { hashInt } from "../substrate/hash";
import {
  compileIntrusionIncident,
  type CompiledIntrusionIncident,
  type IntrusionCampaignBinding,
} from "../../packages/intrusion-library/src";
import { sha256Hex } from "./cognitive-types";
import type {
  AvaHackSession,
  AvaShellSession,
  AvaVirtualFile,
} from "./schema";

export const AVA_HACK_ROOT = "/home/commander/home/signals/current";

const intrusionBindingForState = (state: GameState): IntrusionCampaignBinding => {
  const situation = situationForState(state);
  return {
    campaignId: state.campaignId,
    campaignSeed: state.campaignSeed,
    day: state.day,
    sector: situation.sector,
    disclosureLines: [
      { label: "ENEMY FORCE", value: fmt(state.adversary.force, true) },
      { label: "ENEMY READINESS", value: `${state.adversary.readiness.toFixed(1)}%` },
      { label: "ENEMY EQUIPMENT", value: `${state.adversary.equipment.toFixed(1)}%` },
      { label: "ENEMY MUNITIONS", value: fmt(state.adversary.munitions, true) },
    ],
  };
};

export type AvaHackCase = CompiledIntrusionIncident;

export const avaHackCaseForState = (state: GameState): AvaHackCase =>
  compileIntrusionIncident({
    binding: intrusionBindingForState(state),
    tools: { hashInt, sha256Hex },
  });

export const avaHackDirectories = (shell: Pick<AvaShellSession, "hack">) =>
  shell.hack
    ? [
        "/home/commander/home/signals",
        AVA_HACK_ROOT,
      ]
    : [];

export const avaHackFiles = (
  state: GameState,
  shell: Pick<AvaShellSession, "hack">,
): AvaVirtualFile[] => {
  if (!shell.hack) return [];
  const incident = avaHackCaseForState(state);
  if (shell.hack.caseId !== incident.id) return [];
  const common = {
    kind: "text" as const,
    mode: "0440",
    owner: "ava" as const,
    createdDay: shell.hack.startedDay,
    stateRevision: shell.hack.stateRevision,
  };
  return [
    ...incident.artifacts.map((artifact) => ({
      ...common,
      path: `${AVA_HACK_ROOT}/${artifact.name}`,
      content: artifact.content,
    })),
    ...(shell.hack.status === "solved"
      ? [
          {
            ...common,
            path: `${AVA_HACK_ROOT}/${incident.resultArtifactNames.report}`,
            content: shell.hack.report,
          },
          {
            ...common,
            path: `${AVA_HACK_ROOT}/${incident.resultArtifactNames.proof}`,
            content: `${shell.hack.proof}  ${incident.id}\n`,
          },
        ]
      : []),
  ];
};

export const validAvaHackSession = (
  value: unknown,
  state: GameState,
): value is AvaHackSession => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AvaHackSession>;
  const incident = avaHackCaseForState(state);
  return (
    candidate.caseId === incident.id &&
    candidate.familyId === incident.familyId &&
    candidate.contentVersion === incident.contentVersion &&
    candidate.incidentSchemaVersion === incident.schemaVersion &&
    candidate.campaignId === state.campaignId &&
    candidate.startedDay === state.day &&
    (candidate.status === "open" || candidate.status === "solved") &&
    Number.isInteger(candidate.hints) &&
    Number(candidate.hints) >= 0 &&
    Number(candidate.hints) <= incident.hints.length &&
    Number.isInteger(candidate.attempts) &&
    Number(candidate.attempts) >= 0 &&
    Number(candidate.attempts) <= 100 &&
    typeof candidate.stateRevision === "string" &&
    candidate.stateRevision.length <= 96 &&
    (candidate.status !== "solved" ||
      (candidate.report === incident.report && candidate.proof === incident.proof))
  );
};

const statusText = (state: GameState, shell: AvaShellSession) => {
  const incident = avaHackCaseForState(state);
  if (!shell.hack)
    return [
      "SIGNALS WORKBENCH // IDLE",
      `${incident.title.toUpperCase()}`,
      "Run `hack start`. Ava will explain each terminal operation as you use it.",
    ].join("\n");
  return [
    `SIGNALS WORKBENCH // ${shell.hack.status.toUpperCase()}`,
    `${incident.id} // ${incident.title}`,
    `HINTS ${shell.hack.hints}/${incident.hints.length} // SUBMISSIONS ${shell.hack.attempts}`,
    `WORKSPACE ${AVA_HACK_ROOT}`,
    shell.hack.status === "solved"
      ? "INTELLIGENCE SNAPSHOT AND PROOF RECEIPT UNLOCKED"
      : "NEXT: cat mission.txt",
  ].join("\n");
};

const hintText = (incident: CompiledIntrusionIncident, level: number) =>
  incident.hints[Math.max(0, Math.min(incident.hints.length - 1, level - 1))];

export const executeAvaHack = (
  state: GameState,
  shell: AvaShellSession,
  args: string[],
  stateRevision: string,
): { shell: AvaShellSession; text: string } => {
  const incident = avaHackCaseForState(state);
  const operation = (args[0] ?? (shell.hack ? "status" : "start")).toLowerCase();
  if (operation === "start") {
    const hack =
      shell.hack?.caseId === incident.id &&
      shell.hack.contentVersion === incident.contentVersion
        ? shell.hack
        : {
            caseId: incident.id,
            familyId: incident.familyId,
            contentVersion: incident.contentVersion,
            incidentSchemaVersion: incident.schemaVersion,
            campaignId: state.campaignId,
            startedDay: state.day,
            status: "open" as const,
            hints: 0,
            attempts: 0,
            stateRevision,
          };
    const next = { ...shell, cwd: AVA_HACK_ROOT, hack };
    return {
      shell: next,
      text: [
        `SIGNALS WORKBENCH // ${incident.id}`,
        incident.title.toUpperCase(),
        "This target is a deterministic Delenda simulation. No socket, host process, real credential, or external network is available.",
        "",
        "AVA: Begin with `cat mission.txt`. I will coach the investigation; `hack hint` reveals progressively more syntax.",
      ].join("\n"),
    };
  }
  if (
    !shell.hack ||
    shell.hack.caseId !== incident.id ||
    shell.hack.contentVersion !== incident.contentVersion
  )
    return { shell, text: "hack: no active incident; run hack start" };
  if (operation === "status") return { shell, text: statusText(state, shell) };
  if (operation === "hint" || operation === "coach") {
    const hints = Math.min(incident.hints.length, shell.hack.hints + 1);
    return {
      shell: { ...shell, hack: { ...shell.hack, hints } },
      text: hintText(incident, hints),
    };
  }
  if (operation === "submit") {
    const answer = (args[1] ?? "").toLowerCase().replace(/^node=/, "");
    const attempts = Math.min(100, shell.hack.attempts + 1);
    if (!answer)
      return {
        shell: { ...shell, hack: { ...shell.hack, attempts } },
        text: "hack: submit expects one NODE value",
      };
    if (!incident.verifier.acceptedClaims.includes(answer))
      return {
        shell: { ...shell, hack: { ...shell.hack, attempts } },
        text: [
          `INTRUSION PROOF NOT ACCEPTED // ${answer.toUpperCase()}`,
          "The submitted node is not supported by both the failure count and the key-file difference. No campaign state changed.",
          "AVA: Run `hack hint` or inspect the two evidence paths again.",
        ].join("\n"),
      };
    const hack: AvaHackSession = {
      ...shell.hack,
      status: "solved",
      attempts,
      report: incident.report,
      proof: incident.proof,
    };
    return {
      shell: { ...shell, hack },
      text: [
        `INTRUSION PROOF ACCEPTED // ${answer.toUpperCase()}`,
        incident.verifier.successExplanation,
        `UNLOCKED ${AVA_HACK_ROOT}/${incident.resultArtifactNames.report}`,
        `UNLOCKED ${AVA_HACK_ROOT}/${incident.resultArtifactNames.proof}`,
        "No campaign mutation or strategic order was executed.",
      ].join("\n"),
    };
  }
  return {
    shell,
    text: "hack: use start, status, hint, coach, or submit NODE",
  };
};

export const renderAvaHackScan = (state: GameState, target: string) => {
  const incident = avaHackCaseForState(state);
  if (target.toLowerCase() !== incident.target)
    return `nmap: ${target}: target is outside the declared relay simulation`;
  return [
    incident.scan.heading,
    incident.scan.boundary,
    "HOST                 STATE  SERVICE",
    ...incident.scan.rows.map(
      (row) => `${row.host.padEnd(20)} ${row.state.padEnd(6)} ${row.service}`,
    ),
    `${incident.scan.rows.length} declared hosts available for incident analysis.`,
  ].join("\n");
};
