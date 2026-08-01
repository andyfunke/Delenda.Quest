import {
  fmt,
  liveProjection,
  projectProduction,
  situationForState,
  type GameState,
} from "../game";
import { enumerateAvaActions, avaStateRevision } from "./runtime";
import { buildAvaReport } from "./reports";
import { buildAvaWorkbook } from "./workbook";
import { projectAvaEnvelope } from "./projection";
import {
  AVA_DARK_NET_ROOT,
  avaDarkNetDirectories,
  avaDarkNetFiles,
  executeAvaDarkNet,
  type AvaDarkNetContext,
} from "./darknet";
import type {
  AvaReportCard,
  AvaReportTopic,
  AvaShellInstruction,
  AvaShellSession,
  AvaVirtualFile,
} from "./schema";
import { APHORISMS } from "../aphorisms";
import { AVA_MAN_PAGES, avaManPage, renderAvaManPage } from "./man-pages";
import { sha256Hex } from "./cognitive-types";
import {
  avaHackDirectories,
  avaHackFiles,
  executeAvaHack,
  renderAvaHackScan,
  validAvaHackSession,
} from "./hacking";

export const AVA_HOME = "/home/commander";
export const AVA_INITIAL_CWD = `${AVA_HOME}/home`;
const MAX_OUTPUT_LINES = 120;
const MAX_SAVED_REPORT_SNAPSHOTS = 1_000;
const MAX_GREP_PATTERN_LENGTH = 96;
const MAX_GREP_FILES = 64;
const MAX_GREP_FILE_CHARACTERS = 250_000;
const MAX_DARK_NET_OUTPUT_LINES = 2_000;
const MAX_DARK_NET_GREP_FILES = 2_048;
const MAX_DARK_NET_FILE_CHARACTERS = 2_000_000;

type VirtualDirectory = {
  path: string;
  mode: string;
  owner: "commander" | "ava" | "root";
  denied?: boolean;
};

const staticDirectories: VirtualDirectory[] = [
  { path: "/", mode: "0755", owner: "root" },
  { path: "/etc", mode: "0755", owner: "root" },
  { path: "/etc/ava", mode: "0755", owner: "ava" },
  { path: "/home", mode: "0755", owner: "root" },
  { path: AVA_HOME, mode: "0750", owner: "commander" },
  { path: AVA_INITIAL_CWD, mode: "0750", owner: "commander" },
  { path: `${AVA_INITIAL_CWD}/orders`, mode: "0750", owner: "commander" },
  { path: `${AVA_HOME}/notes`, mode: "0750", owner: "commander" },
  { path: `${AVA_HOME}/archive`, mode: "0750", owner: "commander" },
  { path: `${AVA_HOME}/exports`, mode: "0750", owner: "commander" },
  { path: `${AVA_INITIAL_CWD}/reports`, mode: "0750", owner: "commander" },
  {
    path: `${AVA_INITIAL_CWD}/reports/current`,
    mode: "0750",
    owner: "commander",
  },
  {
    path: `${AVA_INITIAL_CWD}/reports/saved`,
    mode: "0750",
    owner: "commander",
  },
  {
    path: `${AVA_INITIAL_CWD}/reports/history`,
    mode: "0750",
    owner: "commander",
  },
  { path: "/usr", mode: "0755", owner: "root" },
  { path: "/usr/bin", mode: "0755", owner: "root" },
  { path: "/var", mode: "0755", owner: "root" },
  { path: "/var/cache", mode: "0755", owner: "root" },
  { path: "/var/tmp", mode: "1777", owner: "root" },
  { path: "/var/log", mode: "0750", owner: "root", denied: true },
  { path: "/var/lib", mode: "0755", owner: "root" },
  { path: "/var/lib/ava", mode: "0700", owner: "ava", denied: true },
  { path: "/root", mode: "0700", owner: "root", denied: true },
  { path: "/proc", mode: "0555", owner: "root", denied: true },
  { path: "/sys", mode: "0555", owner: "root", denied: true },
];

const reportTopics: Array<AvaReportTopic | "command-dashboard"> = [
  "command-dashboard",
  "daily-brief",
  "operations",
  "production",
  "military",
  "diplomacy",
  "doctrine",
  "service-record",
];
const validReportTopics = new Set<AvaReportTopic | "command-dashboard">([
  "command-dashboard",
  "overview",
  "daily-brief",
  "operations",
  "losses",
  "personnel",
  "retrospective",
  "production",
  "resources",
  "projection",
  "domestic",
  "network",
  "military",
  "diplomacy",
  "doctrine",
  "intelligence",
  "adversary",
  "effects",
  "decision-ledger",
  "opportunities",
  "service-record",
]);

const boundedFraction = (fraction: number) =>
  Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
export const avaReportRevision = (state: GameState, fraction = 0) =>
  `${avaStateRevision(state)}-F${String(
    Math.round(boundedFraction(fraction) * 10_000),
  ).padStart(4, "0")}`;
export const avaSavedReportPath = (
  state: GameState,
  topic: AvaReportTopic,
  extension: "txt" | "xlsx",
  sequence: number,
) =>
  `${AVA_INITIAL_CWD}/reports/saved/day-${String(state.day).padStart(
    3,
    "0",
  )}-${topic}-${String(sequence).padStart(2, "0")}.${extension}`;

const cleanPath = (path: string) => {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
};

const expandAvaPath = (requested: string) =>
    requested === "~"
      ? AVA_HOME
      : requested.startsWith("~/")
        ? `${AVA_HOME}/${requested.slice(2)}`
        : requested;

export const resolveAvaPath = (cwd: string, requested = ".") => {
  const expanded = expandAvaPath(requested);
  return cleanPath(
    expanded.startsWith("/") ? expanded : `${cwd}/${expanded || "."}`,
  );
};

const parentPath = (path: string) =>
  path === "/" ? "/" : path.slice(0, path.lastIndexOf("/")) || "/";
const baseName = (path: string) => path.split("/").filter(Boolean).at(-1) ?? "/";
const isInside = (path: string, parent: string) =>
  path === parent || path.startsWith(`${parent}/`);
const deniedDirectory = (path: string) =>
  staticDirectories.find(
    (directory) => directory.denied && isInside(path, directory.path),
  );
const traversesDeniedDirectory = (
  cwd: string,
  requested: string,
) => {
  const expanded = expandAvaPath(requested || ".");
  const parts = (
    expanded.startsWith("/") ? expanded : `${cwd}/${expanded}`
  ).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(part);
    if (deniedDirectory(`/${resolved.join("/")}`)) return true;
  }
  return false;
};

const reportArchiveText = (report: AvaReportCard) =>
  [
    report.flavor,
    "",
    report.title,
    report.direct,
    "",
    `JUDGMENT: ${report.recommendation}`,
    "",
    "CALCULATION",
    report.calculation.equation,
    ...report.calculation.rows.map((row) => `${row.label}: ${row.value}`),
    "",
    "OBSERVATIONS",
    ...report.history.observations,
  ].join("\n");

const currentReportFile = (
  topic: AvaReportTopic | "command-dashboard",
  state: GameState,
  fraction: number,
): AvaVirtualFile => ({
  path: `${AVA_INITIAL_CWD}/reports/current/${topic}.xlsx`,
  kind: "workbook",
  mode: "0640",
  owner: "commander",
  createdDay: state.day,
  topic,
  stateRevision: avaReportRevision(state, fraction),
  asOfFraction: boundedFraction(fraction),
});

const currentCsvBundleFile = (
  state: GameState,
  fraction: number,
): AvaVirtualFile => ({
  path: `${AVA_INITIAL_CWD}/reports/current/command-dashboard-csv.zip`,
  kind: "workbook",
  mode: "0640",
  owner: "commander",
  createdDay: state.day,
  topic: "command-dashboard",
  stateRevision: avaReportRevision(state, fraction),
  asOfFraction: boundedFraction(fraction),
  mime: "application/zip",
});

const currentTextReport = (
  topic: AvaReportTopic,
  state: GameState,
  fraction: number,
): AvaVirtualFile => {
  const report = buildAvaReport(
    { kind: "REPORT", topic, scope: "current" },
    state,
  );
  return {
    path: `${AVA_INITIAL_CWD}/reports/current/${topic}.txt`,
    kind: "text",
    mode: "0640",
    owner: "commander",
    createdDay: state.day,
    content: reportArchiveText(report),
    topic,
    stateRevision: avaReportRevision(state, fraction),
    asOfFraction: boundedFraction(fraction),
  };
};

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const currentDataFiles = (
  state: GameState,
  fraction: number,
): AvaVirtualFile[] => {
  const revision = avaReportRevision(state, fraction);
  const projected = projectProduction(state);
  const textFile = (name: string, rows: Array<Array<string | number>>): AvaVirtualFile => ({
    path: `${AVA_INITIAL_CWD}/reports/current/${name}.csv`,
    kind: "text",
    mode: "0640",
    owner: "commander",
    createdDay: state.day,
    content: rows.map((row) => row.map(csvCell).join(",")).join("\n"),
    stateRevision: revision,
    asOfFraction: boundedFraction(fraction),
  });
  return [
    textFile("production-data", [
      ["resource", "opening", "output", "requested_use", "fulfilled_use", "closing", "coverage_days"],
      ...projected.lines.map((line) => [
        line.resource,
        line.opening,
        line.output,
        line.requestedUse,
        line.fulfilledUse,
        line.closing,
        line.coverage.toFixed(2),
      ]),
    ]),
    textFile("action-docket", [
      ["handle", "module", "status", "order_cost", "label", "summary"],
      ...enumerateAvaActions(state, fraction).map((action) => [
        action.handle,
        action.parentLabel.split(" / ")[0],
        action.available ? "AVAILABLE" : "LOCKED",
        action.orderCost,
        action.label,
        action.summary,
      ]),
    ]),
    textFile("campaign-metrics", [
      ["metric", "value"],
      ["campaign_day", state.day],
      ["orders_remaining", state.actions],
      ["front_km", state.front.toFixed(1)],
      ["readiness_percent", state.readiness.toFixed(1)],
      ["equipment_percent", state.equipment.toFixed(1)],
      ["intelligence", state.intelligence.toFixed(1)],
      ["treasury_billions", state.treasury.toFixed(2)],
      ["legitimacy", state.legitimacy.toFixed(1)],
      ["resistance", state.resistance.toFixed(1)],
    ]),
    textFile("resolution-history", [
      ["day", "sector", "ground_km", "friendly_losses", "enemy_losses", "net_flight"],
      ...state.resolutionHistory.map((record) => [
        record.resolvedDay,
        record.sector,
        record.outcome.groundMovement.toFixed(1),
        record.personnel.combatLosses,
        record.operations.enemyLosses,
        record.personnel.netDesertion,
      ]),
    ]),
  ];
};

const staticFiles = (
  state: GameState,
  fraction: number,
): AvaVirtualFile[] => {
  const situation = situationForState(state);
  const orders = enumerateAvaActions(state, fraction)
    .filter(
      (action) =>
        action.domain || action.kind === "opportunity-response",
    )
    .map(
      (action) =>
        `[${action.handle}] ${action.label} ${
          action.available ? "AVAILABLE" : "LOCKED"
        }`,
    )
    .join("\n");
  return [
    {
      path: "/etc/issue",
      kind: "text",
      mode: "0644",
      owner: "root",
      createdDay: state.day,
      content: "DELENDA.QUEST Ava Command Environment\n",
      stateRevision: avaStateRevision(state),
    },
    {
      path: "/etc/os-release",
      kind: "text",
      mode: "0644",
      owner: "root",
      createdDay: state.day,
      content:
        'NAME="Delenda Command Environment"\nID=delenda\nVARIANT="sealed-player-shell"\n',
      stateRevision: avaStateRevision(state),
    },
    {
      path: "/etc/ava/help.txt",
      kind: "text",
      mode: "0644",
      owner: "ava",
      createdDay: state.day,
      content:
        "Use `man ava`, `man 5 orders`, or `man <command>`.\nThe shell is sealed: declared adapters can inspect campaign state and commander files but cannot reach the host system.\n",
      stateRevision: avaStateRevision(state),
    },
    {
      path: `${AVA_INITIAL_CWD}/README.txt`,
      kind: "text",
      mode: "0640",
      owner: "commander",
      createdDay: state.day,
      content:
        "AVA REPORT ARCHIVE\n\nCurrent reports are live projections from the authoritative command ledger.\nSaved reports are immutable terminal snapshots. Workbook cells preserve disclosed formulas.\nUse: ls reports/current\nUse: download reports/current/command-dashboard.xlsx\n",
      stateRevision: avaStateRevision(state),
    },
    {
      path: `${AVA_INITIAL_CWD}/orders/current.txt`,
      kind: "text",
      mode: "0640",
      owner: "commander",
      createdDay: state.day,
      content: `DAY ${state.day}\n${situation.sector}\n${situation.question}\n\n${orders}`,
      stateRevision: avaStateRevision(state),
    },
    ...reportTopics.map((topic) => currentReportFile(topic, state, fraction)),
    currentCsvBundleFile(state, fraction),
    ...currentDataFiles(state, fraction),
    ...(
      [
        "daily-brief",
        "operations",
        "production",
        "military",
        "diplomacy",
        "doctrine",
        "service-record",
      ] as AvaReportTopic[]
    ).map((topic) => currentTextReport(topic, state, fraction)),
    ...state.resolutionHistory.map<AvaVirtualFile>((record) => {
      const folder = `${AVA_INITIAL_CWD}/reports/history/day-${String(
        record.resolvedDay,
      ).padStart(3, "0")}`;
      return {
        path: `${folder}/dispatch.txt`,
        kind: "text",
        mode: "0440",
        owner: "commander",
        createdDay: record.resolvedDay,
        content: [
          `DAY ${record.resolvedDay} / ${record.sector}`,
          `GROUND: ${record.outcome.groundMovement >= 0 ? "+" : ""}${record.outcome.groundMovement.toFixed(1)} KM`,
          `FRIENDLY LOSSES: ${fmt(record.personnel.combatLosses, true)}`,
          `NET FLIGHT: ${fmt(record.personnel.netDesertion, true)}`,
          `ENEMY LOSSES: ${fmt(record.operations.enemyLosses, true)}`,
        ].join("\n"),
        stateRevision: avaStateRevision(state),
      };
    }),
  ];
};

const dynamicDirectories = (
  state: GameState,
  shell?: Pick<AvaShellSession, "hack">,
): VirtualDirectory[] => [
  ...state.resolutionHistory.map((record) => ({
    path: `${AVA_INITIAL_CWD}/reports/history/day-${String(
      record.resolvedDay,
    ).padStart(3, "0")}`,
    mode: "0550",
    owner: "commander",
  }) satisfies VirtualDirectory),
  ...avaHackDirectories(shell ?? {}).map((path) => ({
    path,
    mode: "0550",
    owner: "ava" as const,
  })),
];

const allDirectories = (
  state: GameState,
  shell?: Pick<AvaShellSession, "darkNetUnlocked" | "hack">,
) => [
  ...staticDirectories,
  ...dynamicDirectories(state, shell),
  ...(shell?.darkNetUnlocked
    ? avaDarkNetDirectories.map<VirtualDirectory>((path) => ({
        path,
        mode: "0550",
        owner: "ava",
      }))
    : []),
];
const allFiles = (
  state: GameState,
  shell: AvaShellSession,
  fraction: number,
  darkNetContext: AvaDarkNetContext = {},
) => {
  const byPath = new Map<string, AvaVirtualFile>();
  const darkNetFiles = shell.darkNetUnlocked
    ? avaDarkNetFiles(state, fraction, darkNetContext).map<AvaVirtualFile>(
        (file) => ({
          path: file.path,
          kind: "text",
          mode: "0440",
          owner: "ava",
          createdDay: state.day,
          content: file.content,
          stateRevision: avaStateRevision(state),
        }),
      )
    : [];
  for (const file of [
    ...staticFiles(state, fraction),
    ...darkNetFiles,
    ...avaHackFiles(state, shell),
    ...shell.files,
  ])
    byPath.set(file.path, file);
  return [...byPath.values()];
};

export const initialAvaShellSession = (): AvaShellSession => ({
  cwd: AVA_INITIAL_CWD,
  history: [],
  files: [],
  darkNetUnlocked: false,
  installedPackages: [
    "bat",
    "csvkit",
    "less",
    "milhist",
    "nano",
    "net-tools",
    "textutils",
    "tree",
    "vim",
  ],
});

export const serializeAvaShellSession = (shell: AvaShellSession) => ({
  cwd: shell.cwd,
  files: shell.files,
  darkNetUnlocked: shell.darkNetUnlocked,
  installedPackages: shell.installedPackages,
  hack: shell.hack,
});

export const restoreAvaShellSession = (
  value: unknown,
  state: GameState,
): AvaShellSession => {
  const initial = initialAvaShellSession();
  if (!value || typeof value !== "object") return initial;
  const candidate = value as {
    cwd?: unknown;
    files?: unknown;
    darkNetUnlocked?: unknown;
    installedPackages?: unknown;
    hack?: unknown;
  };
  const darkNetUnlocked = candidate.darkNetUnlocked === true;
  const hack = validAvaHackSession(candidate.hack, state)
    ? candidate.hack
    : undefined;
  const requestedCwd =
    typeof candidate.cwd === "string" ? cleanPath(candidate.cwd) : initial.cwd;
  const cwd =
    !deniedDirectory(requestedCwd) &&
    allDirectories(state, { darkNetUnlocked, hack }).some(
      (directory) => directory.path === requestedCwd,
    )
      ? requestedCwd
      : initial.cwd;
  const files = (Array.isArray(candidate.files) ? candidate.files : [])
    .flatMap((raw): AvaVirtualFile[] => {
      if (!raw || typeof raw !== "object") return [];
      const file = raw as Partial<AvaVirtualFile>;
      if (
        typeof file.path !== "string" ||
        cleanPath(file.path) !== file.path ||
        ![
          `${AVA_INITIAL_CWD}/reports/saved/`,
          `${AVA_HOME}/notes/`,
          `${AVA_HOME}/archive/`,
          `${AVA_HOME}/exports/`,
        ].some((root)=>file.path!.startsWith(root)) ||
        (file.kind !== "text" && file.kind !== "workbook") ||
        typeof file.createdDay !== "number" ||
        !Number.isInteger(file.createdDay) ||
        file.createdDay < 1 ||
        typeof file.stateRevision !== "string" ||
        file.stateRevision.length > 96 ||
        (file.topic !== undefined && !validReportTopics.has(file.topic))
      )
        return [];
      if (
        file.kind === "text" &&
        (typeof file.content !== "string" || file.content.length > 250_000)
      )
        return [];
      const rawWorkbookBytes = (raw as { workbookBytes?: unknown })
        .workbookBytes;
      const workbookBytes =
        rawWorkbookBytes instanceof Uint8Array
          ? [...rawWorkbookBytes]
          : Array.isArray(rawWorkbookBytes)
            ? rawWorkbookBytes
            : undefined;
      if (
        file.kind === "workbook" &&
        (!workbookBytes ||
          workbookBytes.length > 2_000_000 ||
          workbookBytes[0] !== 0x50 ||
          workbookBytes[1] !== 0x4b ||
          workbookBytes.some(
            (byte) =>
              !Number.isInteger(byte) || byte < 0 || byte > 255,
          ))
      )
        return [];
      return [
        {
          path: file.path,
          kind: file.kind,
          mode: "0440",
          owner: "commander",
          createdDay: file.createdDay,
          content: file.kind === "text" ? file.content : undefined,
          topic: file.topic,
          stateRevision: file.stateRevision,
          asOfFraction:
            typeof file.asOfFraction === "number"
              ? boundedFraction(file.asOfFraction)
              : undefined,
          workbookBytes: file.kind === "workbook" ? workbookBytes : undefined,
        },
      ];
    });
  const installedPackages = (Array.isArray(candidate.installedPackages)
    ? candidate.installedPackages
    : initial.installedPackages
  ).filter(
    (value): value is string =>
      typeof value === "string" && /^[a-z0-9-]{1,32}$/.test(value),
  );
  return {
    cwd,
    history: [],
    files,
    darkNetUnlocked,
    installedPackages: [...new Set(installedPackages)],
    hack,
  };
};

export const saveAvaReportSnapshot = (
  shell: AvaShellSession,
  state: GameState,
  report: AvaReportCard,
  fraction = 0,
) => {
  const stateRevision = avaReportRevision(state, fraction);
  const matchingWorkbook = shell.files.find(
    (file) =>
      file.kind === "workbook" &&
      file.topic === report.topic &&
      file.stateRevision === stateRevision,
  );
  if (matchingWorkbook)
    return { shell, workbookPath: matchingWorkbook.path };
  const savedSnapshotCount = shell.files.filter(
    (file) =>
      file.kind === "workbook" &&
      file.path.startsWith(`${AVA_INITIAL_CWD}/reports/saved/`),
  ).length;
  if (savedSnapshotCount >= MAX_SAVED_REPORT_SNAPSHOTS)
    return {
      shell,
      workbookPath: null,
      error:
        "AVA ARCHIVE FULL // EXISTING REPORTS REMAIN DOWNLOADABLE; BEGIN A NEW CAMPAIGN TO OPEN A NEW ARCHIVE",
    };
  const prefix = `day-${String(state.day).padStart(3, "0")}-${report.topic}-`;
  const sequence =
    Math.max(
      0,
      ...shell.files.flatMap((file) => {
        const name = baseName(file.path);
        const match = name.match(
          new RegExp(`^${prefix}(\\d+)\\.(?:txt|xlsx)$`),
        );
        return match ? [Number(match[1])] : [];
      }),
    ) + 1;
  const textPath = avaSavedReportPath(
    state,
    report.topic,
    "txt",
    sequence,
  );
  const workbookPath = avaSavedReportPath(
    state,
    report.topic,
    "xlsx",
    sequence,
  );
  const additions: AvaVirtualFile[] = [
    {
      path: textPath,
      kind: "text",
      mode: "0440",
      owner: "commander",
      createdDay: state.day,
      content: reportArchiveText(report),
      topic: report.topic,
      stateRevision,
      asOfFraction: boundedFraction(fraction),
    },
    {
      path: workbookPath,
      kind: "workbook",
      mode: "0440",
      owner: "commander",
      createdDay: state.day,
      topic: report.topic,
      stateRevision,
      asOfFraction: boundedFraction(fraction),
      workbookBytes: [
        ...buildAvaWorkbook(state, report.topic, fraction),
      ],
    },
  ];
  const existing = new Set(shell.files.map((file) => file.path));
  const newFiles = additions.filter((file) => !existing.has(file.path));
  const nextShell = {
    ...shell,
    files: [...shell.files, ...newFiles],
  };
  return { shell: nextShell, workbookPath };
};

const childEntries = (
  path: string,
  state: GameState,
  shell: AvaShellSession,
  fraction: number,
  darkNetContext: AvaDarkNetContext = {},
) => {
  const directories = allDirectories(state, shell)
      .filter(
        (directory) =>
          directory.path !== path && parentPath(directory.path) === path,
      )
      .map((directory) => ({
        name: baseName(directory.path),
        path: directory.path,
        kind: "directory" as const,
        mode: directory.mode,
        owner: directory.owner,
      })),
    files = allFiles(state, shell, fraction, darkNetContext)
      .filter((file) => parentPath(file.path) === path)
      .map((file) => ({
        name: baseName(file.path),
        path: file.path,
        kind: "file" as const,
        mode: file.mode,
        owner: file.owner,
      }));
  return [...directories, ...files].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

const withoutExtension = (name: string) =>
  name.replace(/\.(?:txt|xlsx)$/i, "");

const relativeTo = (path: string, parent: string) =>
  path === parent
    ? "."
    : isInside(path, parent)
      ? path.slice(parent.length + (parent === "/" ? 0 : 1))
      : path;

type FileResolution =
  | { status: "resolved"; file: AvaVirtualFile }
  | { status: "missing" }
  | { status: "ambiguous"; files: AvaVirtualFile[] };

const resolveFileReference = (
  requested: string,
  state: GameState,
  shell: AvaShellSession,
  fraction: number,
  darkNetContext: AvaDarkNetContext = {},
): FileResolution => {
  const files = allFiles(state, shell, fraction, darkNetContext);
  const direct = resolveAvaPath(shell.cwd, requested);
  const exact = files.find((file) => file.path === direct);
  if (exact) return { status: "resolved", file: exact };
  if (requested.includes("/")) return { status: "missing" };
  const needle = requested.toLowerCase();
  const currentChildren = files.filter(
    (file) => parentPath(file.path) === shell.cwd,
  );
  const global = files.filter((file) => {
    const name = baseName(file.path).toLowerCase();
    return name === needle || withoutExtension(name) === needle;
  });
  const local = currentChildren.filter((file) => {
    const name = baseName(file.path).toLowerCase();
    return name === needle || withoutExtension(name) === needle;
  });
  const candidates = local.length ? local : global;
  if (!candidates.length) return { status: "missing" };
  if (candidates.length === 1)
    return { status: "resolved", file: candidates[0] };
  const exactName = candidates.filter(
    (file) => baseName(file.path).toLowerCase() === needle,
  );
  if (exactName.length === 1)
    return { status: "resolved", file: exactName[0] };
  const currentWorkbook = candidates.filter(
    (file) =>
      file.kind === "workbook" &&
      file.path.startsWith(`${AVA_INITIAL_CWD}/reports/current/`),
  );
  if (currentWorkbook.length === 1)
    return { status: "resolved", file: currentWorkbook[0] };
  const workbook = candidates.filter((file) => file.kind === "workbook");
  if (workbook.length === 1)
    return { status: "resolved", file: workbook[0] };
  return { status: "ambiguous", files: candidates };
};

const fileReferenceError = (
  command: string,
  requested: string,
  resolution: Exclude<FileResolution, { status: "resolved" }>,
) =>
  resolution.status === "missing"
    ? `${command}: ${requested}: No such file`
    : `${command}: ${requested}: ambiguous file; use one of:\n${resolution.files
        .map((file) => file.path)
        .join("\n")}`;

const textFileContent = (
  command: string,
  requested: string,
  state: GameState,
  shell: AvaShellSession,
  fraction: number,
  darkNetContext: AvaDarkNetContext,
) => {
  const target = resolveAvaPath(shell.cwd, requested);
  if (
    traversesDeniedDirectory(shell.cwd, requested) ||
    deniedDirectory(target)
  )
    return { ok: false as const, error: `${command}: ${requested}: Permission denied` };
  const resolution = resolveFileReference(
    requested,
    state,
    shell,
    fraction,
    darkNetContext,
  );
  if (resolution.status !== "resolved")
    return {
      ok: false as const,
      error: fileReferenceError(command, requested, resolution),
    };
  if (resolution.file.kind !== "text")
    return { ok: false as const, error: `${command}: ${requested}: binary artifact` };
  return { ok: true as const, text: resolution.file.content ?? "", path: resolution.file.path };
};

const darkNetAphorismIdForPath = (path: string) =>
  path.match(/^\/darknet\/quotes\/(Q\d{3})\.txt$/i)?.[1].toUpperCase();

export const avaShellFileReferences = (
  state: GameState,
  shell: AvaShellSession,
  fraction = 0,
  darkNetContext: AvaDarkNetContext = {},
) => {
  const references = new Set<string>();
  for (const file of allFiles(state, shell, fraction, darkNetContext)) {
    const name = baseName(file.path);
    references.add(file.path);
    references.add(relativeTo(file.path, shell.cwd));
    references.add(name);
    references.add(withoutExtension(name));
  }
  return [...references].filter(Boolean).sort();
};

export const avaShellCompletionCandidates = (
  state: GameState,
  shell: AvaShellSession,
  fraction = 0,
  darkNetContext: AvaDarkNetContext = {},
) => {
  const commands = [
    "pwd",
    "cd ",
    "ls ",
    "cat ",
    "open ",
    "grep ",
    "find ",
    "diff ",
    "sha256sum ",
    "csvlook ",
    "csvcut -c ",
    "csvstat ",
    "nmap relay-grid",
    "hack start",
    "hack status",
    "hack hint",
    "whoami",
    "history",
    "clear",
    "download ",
    "man ",
    "which ",
    "tree ",
    "stat ",
    "file ",
    "ps",
    "systemctl status supply.service",
    "crontab -l",
    "fortune",
    "ava doctor",
    "tor",
    "tor campaign",
    "tor campaign current",
    "tor telemetry",
    "tor quotes",
  ];
  const directories = allDirectories(state, shell)
    .filter((directory) => !directory.denied)
    .flatMap((directory) => {
      const relative = relativeTo(directory.path, shell.cwd);
      return [
        directory.path,
        relative,
        baseName(directory.path),
      ];
    });
  const files = avaShellFileReferences(
    state,
    shell,
    fraction,
    darkNetContext,
  );
  const candidates = new Set(commands);
  for (const directory of directories.filter(Boolean)) {
    candidates.add(`cd ${directory}`);
    candidates.add(`ls ${directory}`);
    candidates.add(`find ${directory}`);
  }
  for (const file of files) {
    candidates.add(file);
    candidates.add(`open ${file}`);
    candidates.add(`cat ${file}`);
    if (/\.xlsx$/i.test(file)) candidates.add(`download ${file}`);
  }
  return [...candidates].sort((left, right) => left.localeCompare(right));
};

const globRegex = (glob: string) =>
  new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replaceAll("*", ".*")
      .replaceAll("?", ".")}$`,
  );

const literalSearchExpression = (pattern: string, insensitive: boolean) =>
  new RegExp(
    pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    insensitive ? "i" : "",
  );

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else cell += character;
  }
  cells.push(cell);
  return cells;
};

const parseCsv = (input: string) =>
  input
    .split("\n")
    .filter((line) => line.length > 0)
    .map(parseCsvLine);

const renderCsvTable = (rows: string[][]) => {
  const bounded = rows.slice(0, MAX_OUTPUT_LINES);
  const widths = bounded.reduce<number[]>((current, row) => {
    row.forEach((cell, index) => {
      current[index] = Math.min(42, Math.max(current[index] ?? 0, cell.length));
    });
    return current;
  }, []);
  return bounded
    .map((row, rowIndex) => {
      const rendered = row
        .map((cell, index) => cell.slice(0, widths[index]).padEnd(widths[index]))
        .join("  ")
        .trimEnd();
      return rowIndex === 0
        ? `${rendered}\n${widths.map((width) => "-".repeat(width)).join("  ")}`
        : rendered;
    })
    .join("\n");
};

export type AvaShellExecution = {
  shell: AvaShellSession;
  text: string;
  clearScreen?: boolean;
  download?: AvaVirtualFile;
  aphorismViewIds?: string[];
  archiveRequest?: {
    operation: "search" | "maps" | "photos" | "open" | "cite" | "save" | "analog";
    query: string;
  };
};

const fail = (shell: AvaShellSession, command: string, message: string) => ({
  shell,
  text: `${command.toLowerCase()}: ${message}`,
});

const BREW_PACKAGES: Record<string, { description: string; commands: string[] }> = {
  bat: { description: "Readable text-file rendering.", commands: ["bat"] },
  bc: { description: "Bounded decimal arithmetic.", commands: ["bc"] },
  cal: { description: "Campaign-day calendar.", commands: ["cal"] },
  csvkit: { description: "CSV inspection adapters.", commands: ["csvlook", "csvcut", "csvstat"] },
  fortune: { description: "The assigned campaign aphorism.", commands: ["fortune"] },
  jq: { description: "Bounded JSON formatting and top-level field selection.", commands: ["jq"] },
  less: { description: "Bounded pipeline pager.", commands: ["less"] },
  milhist: { description: "Library of Congress military-history archive broker.", commands: ["archive", "milhist"] },
  nano: { description: "Bounded commander-note editor.", commands: ["nano"] },
  "net-tools": { description: "Declared relay inventory and virtual socket inspection.", commands: ["nmap", "ss"] },
  textutils: { description: "Bounded text transformation and proof tools.", commands: ["awk", "sed", "tr", "nl", "diff", "sha256sum"] },
  tree: { description: "Visible filesystem hierarchy.", commands: ["tree"] },
  units: { description: "Declared distance and mass conversion.", commands: ["units"] },
  vim: { description: "Bounded modal commander-note editor.", commands: ["vim"] },
};

const commanderWritablePath = (path:string) =>
  [`${AVA_HOME}/notes/`,`${AVA_HOME}/archive/`,`${AVA_HOME}/exports/`].some((root)=>path.startsWith(root)) &&
  /\.(?:md|txt|json|csv)$/i.test(path);

const writeCommanderText = (
  shell:AvaShellSession,
  state:GameState,
  path:string,
  content:string,
) => {
  const file:AvaVirtualFile={path,kind:"text",mode:"0640",owner:"commander",createdDay:state.day,content:content.slice(0,250_000),stateRevision:avaStateRevision(state)};
  return {...shell,files:[...shell.files.filter((entry)=>entry.path!==path),file]};
};

const editorStatus=(editor:NonNullable<AvaShellSession["editor"]>)=>
  `${editor.program.toUpperCase()} // ${editor.path}\nMODE: ${editor.mode.toUpperCase()} // ${editor.buffer.split("\n").length} LINES // ${editor.buffer.length} CHARACTERS`;

const executeEditorInput=(state:GameState,shell:AvaShellSession,raw:string):AvaShellExecution=>{
  const editor=shell.editor;
  if(!editor)return fail(shell,"editor","no editor is open");
  const close=(nextShell:AvaShellSession,text:string)=>({shell:{...nextShell,editor:undefined},text});
  if(editor.program==="nano"){
    if(/^\^w\s+/i.test(raw)){
      const needle=raw.replace(/^\^w\s+/i,"");
      const line=editor.buffer.split("\n").findIndex((entry)=>entry.includes(needle));
      return{shell,text:line>=0?`SEARCH: ${needle} // LINE ${line+1}`:`SEARCH: ${needle} // NOT FOUND`};
    }
    if(/^\^o$/i.test(raw)){
      const written=writeCommanderText(shell,state,editor.path,editor.buffer);
      return{shell:{...written,editor:{...editor,savedBuffer:editor.buffer}},text:`WROTE ${editor.buffer.length} CHARACTERS // ${editor.path}`};
    }
    if(/^\^x$/i.test(raw))return close(shell,editor.buffer===editor.savedBuffer?"NANO CLOSED":"NANO CLOSED // UNSAVED BUFFER DISCARDED");
    const next={...editor,undo:[...editor.undo,editor.buffer].slice(-50),buffer:editor.buffer?`${editor.buffer}\n${raw}`:raw};
    return{shell:{...shell,editor:next},text:editorStatus(next)};
  }
  if(editor.mode==="insert"){
    if(/^(?:esc|escape)$/i.test(raw)){
      const next={...editor,mode:"normal" as const};
      return{shell:{...shell,editor:next},text:editorStatus(next)};
    }
    const next={...editor,undo:[...editor.undo,editor.buffer].slice(-50),buffer:editor.buffer?`${editor.buffer}\n${raw}`:raw};
    return{shell:{...shell,editor:next},text:editorStatus(next)};
  }
  if(raw==="i")return{shell:{...shell,editor:{...editor,mode:"insert"}},text:"-- INSERT --"};
  if(raw==="dd"){
    const lines=editor.buffer.split("\n");
    const next={...editor,undo:[...editor.undo,editor.buffer].slice(-50),buffer:lines.slice(0,-1).join("\n")};
    return{shell:{...shell,editor:next},text:editorStatus(next)};
  }
  if(raw==="u"){
    const previous=editor.undo.at(-1);if(previous===undefined)return{shell,text:"Already at oldest change"};
    const next={...editor,buffer:previous,undo:editor.undo.slice(0,-1)};
    return{shell:{...shell,editor:next},text:editorStatus(next)};
  }
  if(raw.startsWith("/")){
    const needle=raw.slice(1);const line=editor.buffer.split("\n").findIndex((entry)=>entry.includes(needle));
    return{shell,text:line>=0?`/${needle} // LINE ${line+1}`:`Pattern not found: ${needle}`};
  }
  if(raw===":w"||raw===":wq"){
    const written=writeCommanderText(shell,state,editor.path,editor.buffer);
    const saved={...written,editor:{...editor,savedBuffer:editor.buffer}};
    return raw===":wq"?close(saved,`WROTE ${editor.buffer.length} CHARACTERS // ${editor.path}`):{shell:saved,text:`WROTE ${editor.buffer.length} CHARACTERS // ${editor.path}`};
  }
  if(raw===":q")return editor.buffer===editor.savedBuffer?close(shell,"VIM CLOSED"):{shell,text:"E37: No write since last change; use :wq"};
  return{shell,text:"VIM NORMAL // i · dd · u · /PATTERN · :w · :q · :wq"};
};

export const executeAvaShell = (
  state: GameState,
  shell: AvaShellSession,
  instruction: AvaShellInstruction,
  fraction = 0,
  darkNetContext: AvaDarkNetContext = {},
  stdin?: string,
  recordHistory = true,
): AvaShellExecution => {
  const nextShell = {
    ...shell,
    history: recordHistory
      ? [...shell.history, instruction.raw].slice(-200)
      : shell.history,
  };
  const command = instruction.command;
  const args = [...instruction.args];

  if (command === "PIPELINE") {
    let pipelineShell = nextShell;
    let stream = "";
    for (const stage of instruction.stages ?? []) {
      const result = executeAvaShell(
        state,
        pipelineShell,
        stage,
        fraction,
        darkNetContext,
        stream,
        false,
      );
      pipelineShell = result.shell;
      stream = result.text;
      if (/^[a-z0-9-]+: /i.test(stream) && !stream.includes("\n")) break;
    }
    return { shell: pipelineShell, text: stream };
  }
  if (command === "STREAM") {
    const producer = args[0];
    const topic =
      producer === "production"
        ? "production"
        : producer === "military"
          ? "military"
          : producer === "diplomacy"
            ? "diplomacy"
            : producer === "doctrine"
              ? "doctrine"
              : producer === "brief" || producer === "daily brief"
                ? "daily-brief"
                : "overview";
    const report = buildAvaReport(
      { kind: "REPORT", topic, scope: "current" },
      state,
    );
    return {
      shell: nextShell,
      text:
        producer === "missions" || producer === "orders"
          ? staticFiles(state, fraction).find((file) =>
              file.path.endsWith("/orders/current.txt"),
            )?.content ?? ""
          : reportArchiveText(report),
    };
  }

  if(command==="EDITOR_INPUT")return executeEditorInput(state,nextShell,args[0]??"");
  if(command==="AVA_TRACE")return{shell:nextShell,text:shell.lastCompilerTrace?`LAST COMPILER TRACE\n${shell.lastCompilerTrace}\nOPERATORS: ${(shell.lastOperatorFamilies??[]).join(", ")||"NONE"}`:"No prior compiler trace is available in this session."};
  if(command==="PROVE")return{shell:nextShell,text:shell.lastProofDigest?`LAST PROOF RECEIPT\n${shell.lastProofDigest}\nThis digest attests to the canonical visible response without exposing sealed state.`:"No prior proof receipt is available in this session."};

  if (command === "REJECT")
    return fail(
      nextShell,
      "shell",
      args[0] ?? "unsupported or unsafe syntax",
    );
  if (command === "DARK_NET") {
    const result = executeAvaDarkNet(
      state,
      fraction,
      args,
      darkNetContext,
    );
    return {
      shell: {
        ...nextShell,
        cwd: result.cwd ?? nextShell.cwd,
        darkNetUnlocked: true,
      },
      text: result.text,
      aphorismViewIds: result.aphorismViewIds,
    };
  }
  if (command === "PWD") return { shell: nextShell, text: shell.cwd };
  if (command === "WHOAMI")
    return { shell: nextShell, text: "commander" };
  if (command === "HISTORY")
    return {
      shell: nextShell,
      text: nextShell.history
        .map((entry, index) => `${String(index + 1).padStart(4, " ")}  ${entry}`)
        .join("\n"),
    };
  if (command === "CLEAR")
    return { shell: nextShell, text: "", clearScreen: true };
  if (command === "FORTUNE") {
    const quote =
      state.reports.find((report) => report.day === state.day)?.epigraph ??
      situationForState(state).quote;
    const source =
      APHORISMS.find((item) => item.text === quote)?.source ??
      `Campaign dispatch, Day ${state.day}`;
    const rendered = `“${quote}”\n— ${source}`;
    return {
      shell: nextShell,
      text: rendered,
    };
  }
  if (command === "SOCIAL_POST") {
    const quote =
      state.reports.find((report) => report.day === state.day)?.epigraph ??
      situationForState(state).quote;
    return {
      shell: nextShell,
      text: `“${quote}”\n\nDELENDA.QUEST // DAY ${state.day}\nAvailable over browser, SSH, and CLI | https://delenda.quest`,
    };
  }
  if(command==="BREW"){
    const operation=args[0]??"help",name=args[1]?.toLowerCase();
    if(operation==="search"){
      const needle=(name??"").toLowerCase();
      return{shell:nextShell,text:Object.keys(BREW_PACKAGES).filter((item)=>item.includes(needle)).sort().join("\n")};
    }
    if(operation==="info"&&name){const item=BREW_PACKAGES[name];return item?{shell:nextShell,text:`${name}: ${item.description}\nCOMMANDS: ${item.commands.join(", ")}\nSOURCE: DECLARED ADAPTER // NO EXECUTABLE DOWNLOAD`}:fail(nextShell,"brew",`No available formula named ${name}`);}
    if(operation==="install"&&name){
      if(!BREW_PACKAGES[name])return fail(nextShell,"brew",`No available formula named ${name}`);
      const installed=[...new Set([...nextShell.installedPackages,name])].sort();
      return{shell:{...nextShell,installedPackages:installed},text:nextShell.installedPackages.includes(name)?`Warning: ${name} already installed`:`Installed ${name} // DECLARED ADAPTER ENABLED`};
    }
    if(operation==="list")return{shell:nextShell,text:[...nextShell.installedPackages].sort().join("\n")};
    if(operation==="doctor")return{shell:nextShell,text:"Your sealed capability registry is ready to brew. No host paths or executable downloads are enabled."};
    return fail(nextShell,"brew","use search, info, install, list, or doctor");
  }
  if(command==="VIM"||command==="NANO"){
    const program=command.toLowerCase() as "vim"|"nano";
    if(!nextShell.installedPackages.includes(program))return fail(nextShell,program,`adapter is not installed; use brew install ${program}`);
    const path=resolveAvaPath(shell.cwd,args[0]);
    if(!commanderWritablePath(path))return fail(nextShell,program,"only .md, .txt, .json, and .csv files under ~/notes, ~/archive, or ~/exports are writable");
    const resolution=resolveFileReference(args[0],state,shell,fraction,darkNetContext);
    const buffer=resolution.status==="resolved"&&resolution.file.kind==="text"?resolution.file.content??"":"";
    const editor:NonNullable<AvaShellSession["editor"]>={program,path,buffer,savedBuffer:buffer,undo:[],mode:"normal"};
    return{shell:{...nextShell,editor},text:`${editorStatus(editor)}\n${program==="vim"?"NORMAL: i · dd · u · /PATTERN · :w · :q · :wq":"ENTER LINES · ^W PATTERN · ^O WRITE · ^X EXIT"}`};
  }
  if(command==="ARCHIVE"){
    if(!nextShell.installedPackages.includes("milhist"))return fail(nextShell,"archive","milhist adapter is not installed; use brew install milhist");
    const operation=(args[0]??"search").toLowerCase();
    if(!["search","maps","photos","open","cite","save","analog"].includes(operation))return fail(nextShell,"archive","use search, maps, photos, open, cite, save, or analog");
    const query=args.slice(1).join(" ").trim();
    if(!query)return fail(nextShell,"archive",`${operation} requires a query or record id`);
    return{shell:nextShell,text:`ARCHIVE REQUEST // ${operation.toUpperCase()} // ${query}\nAwaiting the normalized Library of Congress broker.`,archiveRequest:{operation:operation as NonNullable<AvaShellExecution["archiveRequest"]>["operation"],query}};
  }
  if(command==="GIT"){
    const operation=args[0]??"status";
    if(operation==="status")return{shell:nextShell,text:`On campaign ${state.campaignId}\nDay ${state.day} · ${state.actions} orders remaining\nState seal ${avaStateRevision(state)}\nWorking tree clean: campaign mutations occur only through the Nexus.`};
    if(operation==="log"){
      const rows=[...state.resolutionHistory].sort((a,b)=>b.resolvedDay-a.resolvedDay).map((record)=>`${record.eventId.slice(-8)} day-${String(record.resolvedDay).padStart(3,"0")} ${record.sector} ${record.outcome.groundMovement>=0?"+":""}${record.outcome.groundMovement.toFixed(1)}km`);
      return{shell:nextShell,text:rows.join("\n")||"No resolved campaign commits."};
    }
    const day=Number(args.join(" ").match(/(?:day[- ]?)?(\d+)/i)?.[1]);
    const record=state.resolutionHistory.find((item)=>item.resolvedDay===day);
    if(operation==="show")return record?{shell:nextShell,text:`commit ${record.eventId}\nDAY ${day} // ${record.sector}\nGROUND ${record.outcome.groundMovement>=0?"+":""}${record.outcome.groundMovement.toFixed(1)} KM\nFRIENDLY LOSSES ${fmt(record.personnel.combatLosses,true)}\nENEMY LOSSES ${fmt(record.operations.enemyLosses,true)}`}:fail(nextShell,"git",`unknown day ${day||""}`);
    if(operation==="diff"){
      const days=args.join(" ").match(/\d+/g)?.map(Number)??[];
      const left=state.resolutionHistory.find((item)=>item.resolvedDay===days[0]),right=state.resolutionHistory.find((item)=>item.resolvedDay===days[1]);
      return left&&right?{shell:nextShell,text:`GROUND: ${left.outcome.groundMovement.toFixed(1)} → ${right.outcome.groundMovement.toFixed(1)}\nFRIENDLY LOSSES: ${left.personnel.combatLosses} → ${right.personnel.combatLosses}\nENEMY LOSSES: ${left.operations.enemyLosses} → ${right.operations.enemyLosses}`}:fail(nextShell,"git","diff expects two resolved day numbers");
    }
    return fail(nextShell,"git","only status, log, show, and diff are available");
  }
  if(command==="SQLITE3"){
    const query=args.filter((arg)=>arg!=="campaign.db").join(" ").trim();
    if(!query)return{shell:nextShell,text:"SQLite 3 // READ ONLY\nTABLES: resolution_history, decisions, production"};
    if(!/^select\b/i.test(query)||/\b(insert|update|delete|drop|alter|attach|pragma)\b/i.test(query))return fail(nextShell,"sqlite3","only bounded SELECT queries are accepted");
    if(/\bfrom\s+resolution_history\b/i.test(query))return{shell:nextShell,text:["day|sector|ground_movement|friendly_losses|enemy_losses",...state.resolutionHistory.slice(0,100).map((record)=>`${record.resolvedDay}|${record.sector}|${record.outcome.groundMovement.toFixed(1)}|${record.personnel.combatLosses}|${record.operations.enemyLosses}`)].join("\n")};
    if(/\bfrom\s+decisions\b/i.test(query))return{shell:nextShell,text:["day|family|choice",...state.decisions.slice(0,100).map((row)=>`${row.day}|${row.family}|${row.choice}`)].join("\n")};
    if(/\bfrom\s+production\b/i.test(query))return{shell:nextShell,text:["resource|stock|allocation|use",...Object.entries(state.production).map(([resource,line])=>`${resource}|${line.stock}|${line.allocation}|${line.use}`)].join("\n")};
    return fail(nextShell,"sqlite3","unknown visible table");
  }
  if(command==="BC"){
    if(!nextShell.installedPackages.includes("bc"))return fail(nextShell,"bc","adapter is not installed; use brew install bc");
    const expression=args.join(" ");const match=expression.match(/^(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)$/);
    if(!match)return fail(nextShell,"bc","expected NUMBER OP NUMBER");
    const left=Number(match[1]),right=Number(match[3]),value=match[2]==="+"?left+right:match[2]==="-"?left-right:match[2]==="*"?left*right:right===0?NaN:left/right;
    return Number.isFinite(value)?{shell:nextShell,text:String(value)}:fail(nextShell,"bc","undefined result");
  }
  if(command==="UNITS"){
    if(!nextShell.installedPackages.includes("units"))return fail(nextShell,"units","adapter is not installed; use brew install units");
    const match=args.join(" ").match(/^(\d+(?:\.\d+)?)\s*(km|mi|kg|lb)\s+(?:to\s+)?(km|mi|kg|lb)$/i);
    if(!match)return fail(nextShell,"units","expected VALUE km|mi|kg|lb to km|mi|kg|lb");
    const rates:Record<string,number>={km:1,mi:1.609344,kg:1,lb:.45359237};
    const groups=(match[2].toLowerCase() in {km:1,mi:1}&&match[3].toLowerCase() in {km:1,mi:1})||(match[2].toLowerCase() in {kg:1,lb:1}&&match[3].toLowerCase() in {kg:1,lb:1});
    return groups?{shell:nextShell,text:`${(Number(match[1])*rates[match[2].toLowerCase()]/rates[match[3].toLowerCase()]).toFixed(4)} ${match[3].toLowerCase()}`}:fail(nextShell,"units","incompatible dimensions");
  }
  if(command==="CAL")return{shell:nextShell,text:`DELENDA CAMPAIGN\nCURRENT DAY: ${state.day}\nRESOLVED: ${state.resolutionHistory.length}\nORDERS REMAINING: ${state.actions}`};
  if(command==="DATE")return{shell:nextShell,text:`CAMPAIGN DAY ${state.day} // ${Math.round(boundedFraction(fraction)*100)}% OF THE CURRENT COMMAND WINDOW ELAPSED`};
  if(command==="ID")return{shell:nextShell,text:"uid=1000(commander) gid=1000(command) groups=1000(command),27(ava-readers)"};
  if(command==="UNAME")return{shell:nextShell,text:"Delenda sealed-command 1.0 Ava-Nexus virtual"};
  if(command==="ENV")return{shell:nextShell,text:[`CAMPAIGN_ID=${state.campaignId}`,`CAMPAIGN_DAY=${state.day}`,`ORDERS_REMAINING=${state.actions}`,`STATE_REVISION=${avaStateRevision(state)}`,`SHELL_AUTHORITY=read-mostly`,"HOST_ACCESS=denied","NETWORK_ACCESS=declared-simulation-only"].join("\n")};
  if(command==="DF"){
    const visible=allFiles(state,nextShell,fraction,darkNetContext),used=visible.reduce((sum,file)=>sum+(file.content?.length??file.workbookBytes?.length??0),0);
    return{shell:nextShell,text:["Filesystem       1K-blocks  Used  Available  Use%  Mounted on",`avafs                  4096  ${Math.ceil(used/1024)}  ${Math.max(0,4096-Math.ceil(used/1024))}  ${Math.min(100,Math.ceil(used/41943))}%  /`].join("\n")};
  }
  if(command==="DU"){
    const root=resolveAvaPath(shell.cwd,args[0]??".");
    if(deniedDirectory(root))return fail(nextShell,"du",`${args[0]??"."}: Permission denied`);
    const files=allFiles(state,nextShell,fraction,darkNetContext).filter(file=>isInside(file.path,root));
    return{shell:nextShell,text:`${Math.ceil(files.reduce((sum,file)=>sum+(file.content?.length??file.workbookBytes?.length??0),0)/1024)}\t${root}`};
  }
  if(command==="TOP")return{shell:nextShell,text:["AVA TOP // VIRTUAL CAMPAIGN PROCESSES // SNAPSHOT",`PID  STATE     UNIT                         AGE`,`101  active    campaign-day.service         day-${state.day}`,`202  active    nexus-command.service        ${state.actions}-orders`,`303  active    production-projection.service ${Object.keys(state.production).length}-lines`,`404  ${state.scheduled.length?"waiting":"idle".padEnd(8)} scheduled-effects.timer      ${state.scheduled.length}-queued`].join("\n")};
  if(command==="SS")return{shell:nextShell,text:["Netid State  Local Address        Peer Address       Process","virt  LISTEN nexus://campaign      surface://all       ava-nexus","virt  ESTAB  ssh://forced-command surface://commander forced-command","No host socket table or external address is exposed."].join("\n")};
  if(command==="HACK")return executeAvaHack(state,nextShell,args,avaStateRevision(state));
  if(command==="NMAP")return{shell:nextShell,text:renderAvaHackScan(state,args[0]??"")};
  if(command==="DIFF"){
    const left=textFileContent("diff",args[0],state,nextShell,fraction,darkNetContext),right=textFileContent("diff",args[1],state,nextShell,fraction,darkNetContext);
    if(!left.ok)return{shell:nextShell,text:left.error};
    if(!right.ok)return{shell:nextShell,text:right.error};
    const leftLines=left.text.split("\n"),rightLines=right.text.split("\n"),limit=Math.max(leftLines.length,rightLines.length),output:string[]=[];
    for(let index=0;index<limit;index+=1)if(leftLines[index]!==rightLines[index]){if(leftLines[index]!==undefined)output.push(`< ${leftLines[index]}`);if(rightLines[index]!==undefined)output.push(`> ${rightLines[index]}`);}
    return{shell:nextShell,text:output.slice(0,MAX_OUTPUT_LINES).join("\n")};
  }
  if(command==="SHA256SUM"){
    if(stdin!==undefined&&!args.length)return{shell:nextShell,text:`${sha256Hex(stdin)}  -`};
    if(!args[0])return fail(nextShell,"sha256sum","expected a text file or pipeline input");
    const input=textFileContent("sha256sum",args[0],state,nextShell,fraction,darkNetContext);
    return input.ok?{shell:nextShell,text:`${sha256Hex(input.text)}  ${args[0]}`}:{shell:nextShell,text:input.error};
  }
  if(command==="CSVLOOK"||command==="CSVCUT"||command==="CSVSTAT"){
    if(!nextShell.installedPackages.includes("csvkit"))return fail(nextShell,command,"csvkit adapter is not installed; use brew install csvkit");
    const fileArg=command==="CSVCUT"?args[2]:args[0];
    let input=stdin;
    if(input===undefined&&fileArg){const result=textFileContent(command.toLowerCase(),fileArg,state,nextShell,fraction,darkNetContext);if(!result.ok)return{shell:nextShell,text:result.error};input=result.text;}
    if(input===undefined)return fail(nextShell,command,"expected a CSV file or pipeline input");
    const rows=parseCsv(input);
    if(!rows.length)return{shell:nextShell,text:""};
    if(command==="CSVLOOK")return{shell:nextShell,text:renderCsvTable(rows)};
    if(command==="CSVSTAT"){
      const header=rows[0],body=rows.slice(1);
      const summaries=header.map((name,index)=>{const values=body.map(row=>row[index]??""),numeric=values.map(Number).filter(Number.isFinite);return numeric.length===values.length&&numeric.length?`${name}: ${values.length} values // min ${Math.min(...numeric)} // max ${Math.max(...numeric)}`:`${name}: ${new Set(values).size} distinct // ${values.length} values`;});
      return{shell:nextShell,text:[`CSV STATISTICS // ${body.length} ROWS // ${header.length} COLUMNS`,...summaries].join("\n")};
    }
    const selectors=(args[1]??"").split(",").filter(Boolean),indices=selectors.map(selector=>/^\d+$/.test(selector)?Number(selector)-1:rows[0].indexOf(selector));
    if(indices.some(index=>index<0||index>=rows[0].length))return fail(nextShell,"csvcut","unknown column selector");
    return{shell:nextShell,text:rows.map(row=>indices.map(index=>csvCell(row[index]??"")).join(",")).join("\n")};
  }
  if (command === "HELP")
    return {
      shell: nextShell,
      text: [
        "AVA SEALED SHELL",
        "pwd · cd [path] · ls [-al] [path] · cat file · open file",
        "grep [-inr] literal [path] · find [path] [-maxdepth n] [-type f|d] [-name glob]",
        "whoami · history · clear · download file",
        "man · which · tree · stat · file · head · tail · sort · uniq · wc · cut · column · less",
        "nl · tr · sed · awk · diff · sha256sum · csvlook · csvcut · csvstat",
        "date · id · uname · env · df · du · top · ss · nmap · hack",
        "brew · vim · nano · archive · git · sqlite3 · ps · systemctl · crontab",
        "Pipelines: status | grep -i readiness · history | tail -10",
        "",
        "Recognized Ava commands remain available outside this shell grammar.",
      ].join("\n"),
    };
  if (command === "MAN") {
    const section = args.length === 2 ? Number(args[0]) : undefined;
    const name = args.at(-1) ?? "";
    const entry = avaManPage(name, section);
    return entry
      ? { shell: nextShell, text: renderAvaManPage(entry) }
      : fail(nextShell, "man", `${name}: No manual entry`);
  }
  if (command === "WHICH") {
    const known = new Set(AVA_MAN_PAGES.filter((page) => page.section === 1).map((page) => page.name));
    return {
      shell: nextShell,
      text: args
        .map((name) =>
          known.has(name.toLowerCase()) ? `/usr/bin/${name.toLowerCase()}` : `${name} not found`,
        )
        .join("\n"),
    };
  }
  if (command === "HOSTNAME")
    return { shell: nextShell, text: "delenda-command" };
  if (command === "UPTIME")
    return {
      shell: nextShell,
      text: `up ${Math.max(1, state.day)} campaign day${state.day === 1 ? "" : "s"}, ${state.actions} orders available`,
    };
  if (command === "PS") {
    const rows = [
      "PID COMMAND                         STATE",
      `  1 campaign-day-${String(state.day).padStart(3, "0")}              active`,
      ...(state.maneuver ? [` 11 ${state.maneuver.padEnd(31)} staged`] : []),
      ...Object.entries(state.active).map(
        ([family, choice], index) =>
          `${String(20 + index).padStart(3, " ")} ${`${family}:${choice}`.padEnd(31)} policy`,
      ),
    ];
    return { shell: nextShell, text: rows.join("\n") };
  }
  if (command === "SYSTEMCTL") {
    const unit = args[1];
    const known: Record<string, [string, string]> = {
      "supply.service": [
        projectProduction(state).lines.some((line) => line.unmetUse > 0) ? "degraded" : "active",
        "Converts current production and stock into fulfilled field use.",
      ],
      "command-network.service": [
        state.networkPosture === "dark" ? "degraded" : "active",
        `Current network posture: ${state.networkPosture}.`,
      ],
      "replacement.service": [
        state.trainingCohorts.length ? "active" : "inactive",
        `${state.trainingCohorts.length} training cohort${state.trainingCohorts.length === 1 ? "" : "s"} in the visible pipeline.`,
      ],
    };
    const record = known[unit];
    return record
      ? {
          shell: nextShell,
          text: `● ${unit}\n   Loaded: sealed campaign adapter\n   Active: ${record[0]}\n   Status: ${record[1]}`,
        }
      : fail(nextShell, "systemctl", `${unit}: Unit not found`);
  }
  if (command === "CRONTAB") {
    const scheduled = state.scheduled.length
      ? state.scheduled.map((item) => `@day-${item.day} ${item.source}`)
      : ["# no player-visible scheduled consequences"];
    return { shell: nextShell, text: scheduled.join("\n") };
  }
  if (command === "AVA_DOCTOR")
    return {
      shell: nextShell,
      text: [
        "AVA DOCTOR",
        `STATE SEAL: ${avaStateRevision(state)}`,
        `DAY: ${state.day}`,
        `VISIBLE FILES: ${allFiles(state, shell, fraction, darkNetContext).length}`,
        `CURRENT DOCKET: ${enumerateAvaActions(state, fraction).filter((action) => action.available).length} available actions`,
        "MUTATION AUTHORITY: canonical Nexus only",
        "RESULT: HEALTHY",
      ].join("\n"),
    };
  if (command === "SUDO")
    return {
      shell: nextShell,
      text: "commander is not in the sudoers file. Authority is not the same thing as root.",
    };
  if (command === "MAKE")
    return {
      shell: nextShell,
      text:
        args.join(" ").toLowerCase() === "victory"
          ? "make: victory requires resolved campaign state; romance is not a build dependency"
          : `make: No rule to make target '${args.join(" ") || "all"}'`,
    };
  if (command === "RM")
    return {
      shell: nextShell,
      text: "rm: sealed filesystem is append-only; no campaign or host data was removed",
    };
  if (command === "HEAD" || command === "TAIL") {
    const count = args[0] === "-n" ? Number(args[1]) : 10;
    const lines = (stdin ?? "").split("\n");
    return {
      shell: nextShell,
      text: (command === "HEAD" ? lines.slice(0, count) : lines.slice(-count)).join("\n"),
    };
  }
  if (command === "SORT") {
    const lines = (stdin ?? "").split("\n").sort((left, right) => left.localeCompare(right));
    if (args[0] === "-r") lines.reverse();
    return { shell: nextShell, text: lines.join("\n") };
  }
  if (command === "UNIQ") {
    const output: Array<{ line: string; count: number }> = [];
    for (const line of (stdin ?? "").split("\n")) {
      const last = output.at(-1);
      if (last?.line === line) last.count += 1;
      else output.push({ line, count: 1 });
    }
    return {
      shell: nextShell,
      text: output
        .map((entry) => args[0] === "-c" ? `${String(entry.count).padStart(7, " ")} ${entry.line}` : entry.line)
        .join("\n"),
    };
  }
  if (command === "WC") {
    const input = stdin ?? "";
    const value =
      args[0] === "-w"
        ? input.trim() ? input.trim().split(/\s+/).length : 0
        : args[0] === "-c"
          ? [...input].length
          : input ? input.split("\n").length : 0;
    return { shell: nextShell, text: String(value) };
  }
  if (command === "CUT") {
    const delimiter = args[1] ?? "\t";
    const field = Number(args[3]) - 1;
    return {
      shell: nextShell,
      text: (stdin ?? "").split("\n").map((line) => line.split(delimiter)[field] ?? "").join("\n"),
    };
  }
  if (command === "COLUMN") {
    const rows = (stdin ?? "").split("\n").map((line) => line.trim().split(/\s+/));
    const widths = rows.reduce<number[]>((current, row) => {
      row.forEach((cell, index) => { current[index] = Math.max(current[index] ?? 0, cell.length); });
      return current;
    }, []);
    return {
      shell: nextShell,
      text: rows.map((row) => row.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd()).join("\n"),
    };
  }
  if (command === "LESS")
    return {
      shell: nextShell,
      text: (stdin ?? "").split("\n").slice(0, MAX_OUTPUT_LINES).join("\n"),
    };
  if(command==="NL"){
    if(stdin===undefined)return fail(nextShell,"nl","pipeline input required");
    return{shell:nextShell,text:stdin.split("\n").flatMap((line,index)=>line||args[0]==="-ba"?[`${String(index+1).padStart(6," ")}\t${line}`]:[]).join("\n")};
  }
  if(command==="TR"){
    if(stdin===undefined)return fail(nextShell,"tr","pipeline input required");
    const from=args[0],to=args[1];
    if(from.length!==to.length)return fail(nextShell,"tr","SET1 and SET2 must have equal length in the bounded adapter");
    const map=new Map([...from].map((character,index)=>[character,[...to][index]]));
    return{shell:nextShell,text:[...stdin].map(character=>map.get(character)??character).join("")};
  }
  if(command==="SED"){
    if(stdin===undefined)return fail(nextShell,"sed","pipeline input required");
    const match=args[0]?.match(/^s(.)(.*?)\1(.*?)\1(g?)$/);
    if(!match)return fail(nextShell,"sed","only s/OLD/NEW/ and s/OLD/NEW/g are available");
    if(!match[2])return fail(nextShell,"sed","OLD may not be empty");
    return{shell:nextShell,text:stdin.split("\n").map(line=>match[4]==="g"?line.split(match[2]).join(match[3]):line.replace(match[2],match[3])).join("\n")};
  }
  if(command==="AWK"){
    if(stdin===undefined)return fail(nextShell,"awk","pipeline input required");
    const hasSeparator=args[0]==="-F",delimiter=hasSeparator?(args[1]??","):" ",program=args.slice(hasSeparator?2:0).join(" "),field=Number(program.match(/^\{print\s+\$(\d+)\}$/)?.[1]);
    if(!Number.isInteger(field)||field<1)return fail(nextShell,"awk","only {print $N} with optional -F DELIMITER is available");
    return{shell:nextShell,text:stdin.split("\n").map(line=>(delimiter===" "?line.trim().split(/\s+/):line.split(delimiter))[field-1]??"").join("\n")};
  }
  if (command === "TREE") {
    const requested = args[0] ?? ".";
    const root = resolveAvaPath(shell.cwd, requested);
    if (deniedDirectory(root)) return fail(nextShell, "tree", `${requested}: Permission denied`);
    const entries = [
      ...allDirectories(state, shell).filter((directory) => !directory.denied && isInside(directory.path, root)),
      ...allFiles(state, shell, fraction, darkNetContext).filter((file) => isInside(file.path, root)),
    ]
      .map((entry) => entry.path)
      .filter((path) => path !== root)
      .sort()
      .slice(0, MAX_OUTPUT_LINES);
    return {
      shell: nextShell,
      text: [baseName(root), ...entries.map((path) => `${"  ".repeat(Math.max(1, path.slice(root.length).split("/").filter(Boolean).length))}${baseName(path)}`)].join("\n"),
    };
  }
  if (command === "STAT" || command === "FILE") {
    const requestedPaths = command === "STAT" ? [args[0]] : args;
    const rows = requestedPaths.map((requested) => {
      const target = resolveAvaPath(shell.cwd, requested);
      const directory = allDirectories(state, shell).find((entry) => entry.path === target);
      if (directory)
        return command === "STAT"
          ? `File: ${target}\nType: directory\nMode: ${directory.mode}\nOwner: ${directory.owner}\nCampaign day: ${state.day}`
          : `${requested}: directory`;
      const resolution = resolveFileReference(requested, state, shell, fraction, darkNetContext);
      if (resolution.status !== "resolved") return fileReferenceError(command.toLowerCase(), requested, resolution);
      const file = resolution.file;
      return command === "STAT"
        ? `File: ${file.path}\nType: ${file.kind}\nMode: ${file.mode}\nOwner: ${file.owner}\nCampaign day: ${file.createdDay}\nState revision: ${file.stateRevision}`
        : `${requested}: ${file.kind === "workbook" ? "Microsoft Excel 2007+ workbook" : "UTF-8 text"}`;
    });
    return { shell: nextShell, text: rows.join("\n") };
  }
  if (command === "CD") {
    const requested = args[0] ?? AVA_HOME;
    const target = resolveAvaPath(
      shell.cwd,
      requested,
    );
    if (traversesDeniedDirectory(shell.cwd, requested) || deniedDirectory(target))
      return fail(nextShell, "cd", `${requested}: Permission denied`);
    const directory = allDirectories(state, shell).find(
      (candidate) => candidate.path === target,
    );
    if (!directory)
      return fail(nextShell, "cd", `${args[0] ?? target}: No such directory`);
    return { shell: { ...nextShell, cwd: target }, text: target };
  }
  if (command === "LS") {
    const long = args.some((arg) => /^-[al]+$/.test(arg));
    const requested = args.find((arg) => !arg.startsWith("-")) ?? ".";
    const target = resolveAvaPath(shell.cwd, requested);
    if (traversesDeniedDirectory(shell.cwd, requested) || deniedDirectory(target))
      return fail(nextShell, "ls", `${requested}: Permission denied`);
    const file = allFiles(state, shell, fraction, darkNetContext).find(
      (candidate) => candidate.path === target,
    );
    if (file)
      return { shell: nextShell, text: long ? `${file.mode} ${file.owner} ${baseName(file.path)}` : baseName(file.path) };
    if (!allDirectories(state, shell).some((directory) => directory.path === target))
      return fail(nextShell, "ls", `${requested}: No such file or directory`);
    const entries = childEntries(
      target,
      state,
      shell,
      fraction,
      darkNetContext,
    );
    return {
      shell: nextShell,
      text: long
        ? entries
            .map(
              (entry) =>
                `${entry.kind === "directory" ? "d" : "-"}${entry.mode.slice(1)} ${entry.owner.padEnd(9)} ${entry.name}`,
            )
            .join("\n")
        : entries.map((entry) => entry.name).join("  "),
    };
  }
  if (command === "CAT") {
    if (!args.length) return fail(nextShell, "cat", "missing file operand");
    const output: string[] = [];
    const aphorismViewIds = new Set<string>();
    for (const requested of args) {
      const target = resolveAvaPath(shell.cwd, requested);
      if (
        traversesDeniedDirectory(shell.cwd, requested) ||
        deniedDirectory(target)
      ) {
        output.push(`cat: ${requested}: Permission denied`);
        continue;
      }
      const resolution = resolveFileReference(
        requested,
        state,
        shell,
        fraction,
        darkNetContext,
      );
      if (resolution.status !== "resolved") {
        output.push(fileReferenceError("cat", requested, resolution));
        continue;
      }
      const file = resolution.file;
      const aphorismId = darkNetAphorismIdForPath(file.path);
      if (aphorismId) aphorismViewIds.add(aphorismId);
      output.push(
        file.kind === "workbook"
          ? `${requested}: binary Excel workbook; use download ${requested}`
          : file.content ?? "",
      );
    }
    return {
      shell: nextShell,
      text: output.join("\n"),
      aphorismViewIds: [...aphorismViewIds],
    };
  }
  if(command==="BAT"){
    if(!nextShell.installedPackages.includes("bat"))return fail(nextShell,"bat","adapter is not installed; use brew install bat");
    const requested=args[0];if(!requested)return fail(nextShell,"bat","expected one text file");
    const resolution=resolveFileReference(requested,state,shell,fraction,darkNetContext);
    if(resolution.status!=="resolved")return{shell:nextShell,text:fileReferenceError("bat",requested,resolution)};
    if(resolution.file.kind!=="text")return fail(nextShell,"bat",`${requested}: binary artifact`);
    return{shell:nextShell,text:(resolution.file.content??"").split("\n").slice(0,MAX_OUTPUT_LINES).map((line,index)=>`${String(index+1).padStart(4," ")} │ ${line}`).join("\n")};
  }
  if(["HEAD","TAIL","SORT","UNIQ","WC","CUT","COLUMN","LESS","JQ"].includes(command))
    return fail(nextShell,command,"pipeline input required");
  if (command === "OPEN") {
    if (args.length !== 1)
      return fail(nextShell, "open", "expected one file");
    const requested = args[0];
    const target = resolveAvaPath(shell.cwd, requested);
    if (
      traversesDeniedDirectory(shell.cwd, requested) ||
      deniedDirectory(target)
    )
      return fail(nextShell, "open", `${requested}: Permission denied`);
    const resolution = resolveFileReference(
      requested,
      state,
      shell,
      fraction,
      darkNetContext,
    );
    if (resolution.status !== "resolved")
      return {
        shell: nextShell,
        text: fileReferenceError("open", requested, resolution),
      };
    const file = resolution.file;
    const aphorismId = darkNetAphorismIdForPath(file.path);
    if (file.kind === "workbook")
      return {
        shell: nextShell,
        text: `open: ${baseName(file.path)}`,
        download: file,
      };
    return {
      shell: nextShell,
      text: file.content ?? "",
      aphorismViewIds: aphorismId ? [aphorismId] : [],
    };
  }
  if (command === "DOWNLOAD") {
    if (args.length !== 1)
      return fail(nextShell, "download", "expected one .xlsx file");
    const target = resolveAvaPath(shell.cwd, args[0]);
    if (
      traversesDeniedDirectory(shell.cwd, args[0]) ||
      deniedDirectory(target)
    )
      return fail(nextShell, "download", `${args[0]}: Permission denied`);
    const resolution = resolveFileReference(
      args[0],
      state,
      shell,
      fraction,
      darkNetContext,
    );
    if (resolution.status !== "resolved")
      return {
        shell: nextShell,
        text: fileReferenceError("download", args[0], resolution),
      };
    const file = resolution.file;
    if (file.kind !== "workbook")
      return fail(nextShell, "download", `${args[0]}: Not an Excel workbook`);
    return {
      shell: nextShell,
      text: `download: ${baseName(file.path)}`,
      download: file,
    };
  }
  if (command === "GREP") {
    const flags = args.filter((arg) => /^-[inr]+$/.test(arg)).join("");
    const operands = args.filter((arg) => !/^-[inr]+$/.test(arg));
    if (!operands.length)
      return fail(nextShell, "grep", "expected PATTERN [PATH]");
    const [pattern, ...explicitPaths] = operands;
    if (stdin !== undefined && !explicitPaths.length) {
      if (pattern.length > MAX_GREP_PATTERN_LENGTH)
        return fail(nextShell, "grep", `literal pattern exceeds the ${MAX_GREP_PATTERN_LENGTH}-character limit`);
      const expression = literalSearchExpression(pattern, flags.includes("i"));
      return {
        shell: nextShell,
        text: stdin
          .split("\n")
          .flatMap((line, index) =>
            expression.test(line)
              ? [`${flags.includes("n") ? `${index + 1}:` : ""}${line}`]
              : [],
          )
          .slice(0, MAX_OUTPUT_LINES)
          .join("\n"),
      };
    }
    const inDarkNet = isInside(shell.cwd, AVA_DARK_NET_ROOT);
    const requestedPaths =
      explicitPaths.length
        ? explicitPaths
        : inDarkNet
          ? ["."]
          : [];
    if (!requestedPaths.length)
      return fail(nextShell, "grep", "expected PATTERN and PATH");
    const effectiveFlags =
      !explicitPaths.length && inDarkNet && !flags.includes("r")
        ? `${flags}r`
        : flags;
    const blockedPath = requestedPaths.find((requested) =>
      traversesDeniedDirectory(shell.cwd, requested) ||
      deniedDirectory(resolveAvaPath(shell.cwd, requested)),
    );
    if (blockedPath)
      return fail(nextShell, "grep", `${blockedPath}: Permission denied`);
    const searchableFiles = allFiles(
      state,
      shell,
      fraction,
      darkNetContext,
    );
    for (const requested of requestedPaths) {
      const target = resolveAvaPath(shell.cwd, requested);
      const fileExists = searchableFiles.some(
        (file) => file.path === target,
      );
      const directoryExists = allDirectories(state, shell).some(
        (directory) => directory.path === target,
      );
      if (!fileExists && !directoryExists)
        return fail(nextShell, "grep", `${requested}: No such file or directory`);
      if (directoryExists && !effectiveFlags.includes("r"))
        return fail(nextShell, "grep", `${requested}: Is a directory`);
    }
    if (pattern.length > MAX_GREP_PATTERN_LENGTH)
      return fail(
        nextShell,
        "grep",
        `literal pattern exceeds the ${MAX_GREP_PATTERN_LENGTH}-character limit`,
      );
    const expression = literalSearchExpression(
      pattern,
      effectiveFlags.includes("i"),
    );
    const darkNetSearch = requestedPaths.some((requested) =>
      isInside(resolveAvaPath(shell.cwd, requested), AVA_DARK_NET_ROOT),
    );
    const fileLimit = darkNetSearch
      ? MAX_DARK_NET_GREP_FILES
      : MAX_GREP_FILES;
    const characterLimit = darkNetSearch
      ? MAX_DARK_NET_FILE_CHARACTERS
      : MAX_GREP_FILE_CHARACTERS;
    const candidates = searchableFiles
      .filter((file) => {
        if (file.kind !== "text") return false;
        if (deniedDirectory(file.path)) return false;
        return requestedPaths.some((requested) => {
          const target = resolveAvaPath(shell.cwd, requested);
          return (
            file.path === target ||
            (effectiveFlags.includes("r") && isInside(file.path, target))
          );
        });
      })
      .slice(0, fileLimit);
    const aphorismViewIds = new Set<string>();
    const matches = candidates.flatMap((file) =>
      (file.content ?? "")
        .slice(0, characterLimit)
        .split("\n")
        .flatMap((line, index) => {
          if (!expression.test(line)) return [];
          const aphorismId = darkNetAphorismIdForPath(file.path);
          if (aphorismId) aphorismViewIds.add(aphorismId);
          return [
            `${candidates.length > 1 || effectiveFlags.includes("r") ? `${file.path}:` : ""}${effectiveFlags.includes("n") ? `${index + 1}:` : ""}${line}`,
          ];
        }),
    );
    const outputLimit = darkNetSearch
      ? MAX_DARK_NET_OUTPUT_LINES
      : MAX_OUTPUT_LINES;
    return {
      shell: nextShell,
      text: matches.slice(0, outputLimit).join("\n"),
      aphorismViewIds: [...aphorismViewIds],
    };
  }
  if (command === "FIND") {
    const startArg = args[0] && !args[0].startsWith("-") ? args.shift()! : ".";
    const start = resolveAvaPath(shell.cwd, startArg);
    if (
      traversesDeniedDirectory(shell.cwd, startArg) ||
      deniedDirectory(start)
    )
      return fail(nextShell, "find", `${startArg}: Permission denied`);
    const startExists =
      allDirectories(state, shell).some((directory) => directory.path === start) ||
      allFiles(state, shell, fraction, darkNetContext).some((file) => file.path === start);
    if (!startExists)
      return fail(nextShell, "find", `${startArg}: No such file or directory`);
    const maxDepthIndex = args.indexOf("-maxdepth");
    const maxDepth =
      maxDepthIndex >= 0
        ? Math.max(0, Math.min(8, Number(args[maxDepthIndex + 1]) || 0))
        : 5;
    const typeIndex = args.indexOf("-type");
    const type = typeIndex >= 0 ? args[typeIndex + 1] : undefined;
    const nameIndex = args.indexOf("-name");
    const namePattern =
      nameIndex >= 0 ? globRegex(args[nameIndex + 1] ?? "*") : null;
    const depth = (path: string) =>
      path.split("/").filter(Boolean).length -
      start.split("/").filter(Boolean).length;
    const directories = allDirectories(state, shell)
      .filter(
        (directory) =>
          isInside(directory.path, start) &&
          depth(directory.path) <= maxDepth &&
          !directory.denied,
      )
      .map((directory) => ({ path: directory.path, type: "d" }));
    const files = allFiles(state, shell, fraction, darkNetContext)
      .filter(
        (file) =>
          !deniedDirectory(file.path) &&
          isInside(file.path, start) &&
          depth(file.path) <= maxDepth,
      )
      .map((file) => ({ path: file.path, type: "f" }));
    const results = [...directories, ...files]
      .filter((entry) => !type || type === entry.type)
      .filter((entry) => !namePattern || namePattern.test(baseName(entry.path)))
      .sort((left, right) => left.path.localeCompare(right.path))
      .slice(0, MAX_OUTPUT_LINES);
    const blocked = allDirectories(state, shell)
      .filter(
        (directory) =>
          directory.denied &&
          isInside(directory.path, start) &&
          depth(directory.path) <= maxDepth,
      )
      .map((directory) => `find: ${directory.path}: Permission denied`);
    return {
      shell: nextShell,
      text: [
        ...results.map((entry) => entry.path),
        ...blocked,
      ]
        .slice(0, MAX_OUTPUT_LINES)
        .join("\n"),
    };
  }
  return fail(nextShell, command, "unsupported command");
};

export const avaFilesystemSnapshot = (
  state: GameState,
  fraction = 0,
) => {
  const production = projectProduction(state);
  const live = liveProjection(state, fraction);
  const envelope = projectAvaEnvelope(state);
  const personnel = envelope.personnel;
  const operations = envelope;
  return {
    stateRevision: avaStateRevision(state),
    day: state.day,
    production: production.lines.map((line) => ({
      resource: line.resource,
      allocation: line.allocation,
      production: line.output,
      current: line.opening,
      required: line.requestedUse,
      liveStock: live.production[line.resource],
      balance: line.net,
    })),
    personnel: {
      attempts: personnel.desertion,
      retained: personnel.retained,
      intercepted: personnel.intercepted,
      netFlight: personnel.netDesertion,
    },
    operations: {
      committed: operations.committed,
      frontageDemand: operations.frontageDemand,
      forceRatio: operations.forceRatio,
      groundMovement: operations.groundMovement,
    },
  };
};
