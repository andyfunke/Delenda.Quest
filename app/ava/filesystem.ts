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
        "Supported commands: pwd cd ls cat grep find whoami history clear download.\nThis is a sealed campaign filesystem. It cannot reach the host system.\n",
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

const dynamicDirectories = (state: GameState): VirtualDirectory[] =>
  state.resolutionHistory.map((record) => ({
    path: `${AVA_INITIAL_CWD}/reports/history/day-${String(
      record.resolvedDay,
    ).padStart(3, "0")}`,
    mode: "0550",
    owner: "commander",
  }));

const allDirectories = (
  state: GameState,
  shell?: Pick<AvaShellSession, "darkNetUnlocked">,
) => [
  ...staticDirectories,
  ...dynamicDirectories(state),
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
});

export const serializeAvaShellSession = (shell: AvaShellSession) => ({
  cwd: shell.cwd,
  files: shell.files,
  darkNetUnlocked: shell.darkNetUnlocked,
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
  };
  const darkNetUnlocked = candidate.darkNetUnlocked === true;
  const requestedCwd =
    typeof candidate.cwd === "string" ? cleanPath(candidate.cwd) : initial.cwd;
  const cwd =
    !deniedDirectory(requestedCwd) &&
    allDirectories(state, { darkNetUnlocked }).some(
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
        !file.path.startsWith(`${AVA_INITIAL_CWD}/reports/saved/`) ||
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
  return { cwd, history: [], files, darkNetUnlocked };
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
    "whoami",
    "history",
    "clear",
    "download ",
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

export type AvaShellExecution = {
  shell: AvaShellSession;
  text: string;
  clearScreen?: boolean;
  download?: AvaVirtualFile;
  aphorismViewIds?: string[];
};

const fail = (shell: AvaShellSession, command: string, message: string) => ({
  shell,
  text: `${command.toLowerCase()}: ${message}`,
});

export const executeAvaShell = (
  state: GameState,
  shell: AvaShellSession,
  instruction: AvaShellInstruction,
  fraction = 0,
  darkNetContext: AvaDarkNetContext = {},
): AvaShellExecution => {
  const nextShell = {
    ...shell,
    history: [...shell.history, instruction.raw].slice(-200),
  };
  const command = instruction.command;
  const args = [...instruction.args];

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
  if (command === "HELP")
    return {
      shell: nextShell,
      text: [
        "AVA SEALED SHELL",
        "pwd · cd [path] · ls [-al] [path] · cat file · open file",
        "grep [-inr] literal [path] · find [path] [-maxdepth n] [-type f|d] [-name glob]",
        "whoami · history · clear · download file.xlsx",
        "",
        "Recognized Ava commands remain available outside this shell grammar.",
      ].join("\n"),
    };
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
