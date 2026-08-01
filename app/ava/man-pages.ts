export type AvaManPage = {
  name: string;
  section: 1 | 5 | 7 | 8;
  synopsis: string;
  description: string;
  options?: string[];
  examples?: string[];
  source: string;
};

const page = (
  name: string,
  synopsis: string,
  description: string,
  options: string[] = [],
  examples: string[] = [],
  section: AvaManPage["section"] = 1,
): AvaManPage => ({
  name,
  section,
  synopsis,
  description,
  options,
  examples,
  source:
    "DELENDA abridgment of the corresponding POSIX/GNU/Linux manual. Only implemented behavior is retained.",
});

export const AVA_MAN_PAGES: readonly AvaManPage[] = [
  page("pwd", "pwd", "Print the current sealed-shell directory."),
  page("cd", "cd [DIRECTORY]", "Change the sealed-shell working directory. Tilde expands to /home/commander."),
  page("ls", "ls [-a] [-l] [PATH]", "List one visible file or directory.", ["-a  include ordinary hidden entries when present", "-l  show mode and owner"]),
  page("cat", "cat FILE...", "Concatenate readable virtual text files. Binary artifacts are identified but not printed; no host filesystem is visible.", [], ["cat reports/current/production-data.csv", "cat auth.log | grep AUTH=FAIL"]),
  page("open", "open FILE", "Render a text file or prepare a binary artifact for download."),
  page("grep", "grep [-i] [-n] [-r] PATTERN [PATH]", "Select lines containing a literal pattern. In a pipeline, PATH is omitted and standard input is searched.", ["-i  ignore case", "-n  show line numbers", "-r  recurse through visible files"], ["production | grep -i shortage", "cat auth.log | grep AUTH=FAIL"]),
  page("find", "find [PATH] [-maxdepth N] [-type f|d] [-name GLOB]", "Walk the visible virtual filesystem with bounded depth and output."),
  page("head", "head [-n N]", "Write the first N pipeline lines.", ["-n N  line count; default 10"]),
  page("tail", "tail [-n N]", "Write the last N pipeline lines.", ["-n N  line count; default 10"]),
  page("sort", "sort [-r]", "Sort pipeline lines lexically.", ["-r  reverse order"]),
  page("uniq", "uniq [-c]", "Collapse adjacent duplicate pipeline lines.", ["-c  prefix occurrence count"]),
  page("wc", "wc [-l|-w|-c]", "Count pipeline lines, words, or UTF-8 text characters.", ["-l  lines", "-w  words", "-c  characters"]),
  page("cut", "cut -d DELIMITER -f FIELD", "Select one 1-based delimited field from each pipeline line."),
  page("column", "column [-t]", "Align whitespace- or delimiter-separated pipeline records as a table.", ["-t  table mode"]),
  page("less", "less", "Bounded non-interactive pager for pipeline output. No host terminal is opened."),
  page("which", "which COMMAND...", "Report the declared virtual executable path for enabled commands."),
  page("tree", "tree [PATH]", "Render the visible directory hierarchy to a bounded depth."),
  page("stat", "stat PATH", "Show virtual type, mode, owner, campaign day, and state revision."),
  page("file", "file PATH...", "Classify visible text, workbook, and archive artifacts."),
  page("history", "history", "Show commands retained in this shell session."),
  page("clear", "clear", "Clear the current terminal presentation."),
  page("download", "download FILE", "Prepare a visible workbook or archive artifact for local download."),
  page("man", "man [SECTION] PAGE", "Display an abridged manual page for implemented commands and Delenda ontology."),
  page("help", "help COMMAND", "Show concise terminal help for one implemented command."),
  page("whoami", "whoami", "Print the sealed-shell user name."),
  page("brew", "brew search|info|install|list|doctor [PACKAGE]", "Manage declared command adapters. Install enables a registry entry and never downloads executable code."),
  page("vim", "vim FILE", "Edit a commander-owned text file using bounded normal and insert modes. Implemented commands: i, esc, dd, u, /PATTERN, :w, :q, and :wq."),
  page("nano", "nano FILE", "Edit a commander-owned text file using line input. Implemented controls: ^W PATTERN, ^O, and ^X."),
  page("archive", "archive search|maps|photos|open|cite|save|analog QUERY", "Create a read-only request for the cited military-history archive broker."),
  page("git", "git status|log|show|diff", "Inspect immutable campaign transitions using Git vocabulary. Mutation commands are unavailable."),
  page("sqlite3", "sqlite3 campaign.db [SELECT]", "Query bounded player-visible campaign tables. Only SELECT is accepted."),
  page("jq", "jq [.FIELD]", "Format pipeline JSON or select one top-level field."),
  page("bat", "bat FILE", "Render one visible text file with line numbers."),
  page("bc", "bc NUMBER OP NUMBER", "Evaluate one bounded arithmetic expression using +, -, *, or /."),
  page("units", "units VALUE UNIT to UNIT", "Convert km and mi, or kg and lb."),
  page("cal", "cal", "Print the current campaign day, resolved-day count, and orders remaining."),
  page("date", "date", "Print the current campaign day and elapsed command-window fraction. It does not read the host clock."),
  page("id", "id", "Print the declared sealed-shell identity and virtual groups."),
  page("uname", "uname", "Print the declared Delenda command-environment identity."),
  page("env", "env", "Print bounded campaign and shell environment values. Host environment variables and secrets are unavailable."),
  page("df", "df", "Summarize capacity of the visible in-memory Ava filesystem."),
  page("du", "du [PATH]", "Count visible virtual artifact bytes beneath one allowed path."),
  page("top", "top", "Render one non-interactive snapshot of campaign services as virtual processes."),
  page("ss", "ss", "Render declared Nexus and SSH adapter endpoints. No host socket table or remote address is queried."),
  page("nl", "nl [-ba]", "Number pipeline lines. Empty lines are numbered only with -ba.", ["-ba  number all lines"]),
  page("tr", "tr SET1 SET2", "Translate equal-length character sets in pipeline input."),
  page("sed", "sed s/OLD/NEW/[g]", "Apply one literal bounded substitution to every pipeline line."),
  page("awk", "awk [-F DELIMITER] '{print $N}'", "Project one field from pipeline records. General programs, files, subprocesses, and system functions are unavailable."),
  page("diff", "diff FILE FILE", "Show differing lines from two visible virtual text files."),
  page("sha256sum", "sha256sum [FILE]", "Hash one visible text file or pipeline stream with SHA-256."),
  page("csvlook", "csvlook [FILE]", "Render a bounded CSV file or pipeline stream as an aligned table."),
  page("csvcut", "csvcut -c COLUMN[,COLUMN] [FILE]", "Select CSV columns by header or 1-based index."),
  page("csvstat", "csvstat [FILE]", "Summarize bounded CSV row counts, distinct values, and numeric ranges."),
  page("nmap", "nmap relay-grid", "Inspect the declared in-world relay inventory. The adapter cannot accept an IP, domain, socket, or external target."),
  page("hack", "hack start|status|hint|submit NODE", "Open and solve Ava's coached signals incident using ordinary virtual files and pipelines. Submissions unlock a one-time intelligence snapshot and proof receipt; they do not mutate campaign state."),
  page("ps", "ps", "List current orders, policies, and delayed effects as virtual processes."),
  page("systemctl", "systemctl status UNIT", "Inspect a declared campaign institution such as supply.service or command-network.service."),
  page("crontab", "crontab -l", "List player-visible scheduled consequences. Editing is disabled."),
  page("hostname", "hostname", "Print the virtual command environment host name."),
  page("uptime", "uptime", "Print campaign-day age and remaining order capacity."),
  page("fortune", "fortune", "Print the quote assigned to the current campaign day."),
  page("social-post", "generate social post", "Compose a copy-ready post from the current day's assigned quote, the canonical HTTPS link, and the browser, SSH, and CLI availability line."),
  page("sudo", "sudo [COMMAND]", "Return the authored authority Easter egg. Privilege escalation is never attempted."),
  page("make", "make [TARGET]", "Evaluate an authored build-target Easter egg. No programs are compiled."),
  page("rm", "rm [OPERAND]", "Explain the append-only sealed filesystem. No file or campaign state is removed."),
  page("ava", "ava doctor", "Validate the current shell, docket, report archive, and state seal without mutating the campaign."),
  page("explain", "explain --trace last", "Show the last retained compiler trace and cognitive operator families without disclosing sealed state."),
  page("prove", "prove last", "Show the last public proof-receipt digest without exposing authority material."),
  page("tor", "tor [campaign|telemetry|quotes]", "Open the bounded Dark Net archive of authored campaign material and public aggregate telemetry."),
  page("pipe", "PRODUCER | FILTER [| FILTER ...]", "Connect one read-only text producer to up to seven implemented presentation filters. Mutation, redirection, substitution, and host execution remain unavailable."),
  page("uncertainty", "man 7 uncertainty", "Unresolved outcomes remain sealed. Ava may disclose estimates, intervals, assumptions, and provenance but not pre-resolve the branch.", [], [], 7),
  page("orders", "man 5 orders", "Orders are typed, day-scoped, revision-bound records. Preparation and confirmation are separate operations.", [], [], 5),
  page("ava", "man 7 ava", "Ava Classic is the deterministic reference intelligence over the canonical Nexus. Every surface receives the same semantic facts and mutation authority.", [], [], 7),
];

export const avaManPage = (name: string, section?: number) =>
  AVA_MAN_PAGES.find(
    (candidate) =>
      candidate.name === name.toLowerCase() &&
      (section === undefined || candidate.section === section),
  );

export const renderAvaManPage = (entry: AvaManPage) =>
  [
    `${entry.name.toUpperCase()}(${entry.section})`,
    `NAME\n    ${entry.name} - ${entry.description}`,
    `SYNOPSIS\n    ${entry.synopsis}`,
    entry.options?.length
      ? `OPTIONS\n${entry.options.map((line) => `    ${line}`).join("\n")}`
      : null,
    entry.examples?.length
      ? `EXAMPLES\n${entry.examples.map((line) => `    ${line}`).join("\n")}`
      : null,
    `AUTHORITY\n    ${entry.source}`,
  ]
    .filter((section): section is string => Boolean(section))
    .join("\n\n");
