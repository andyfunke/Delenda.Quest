/** Closed §4.8 taxonomies — mirrored for lab presentation (contracts remain authority). */
const DISPOSITION_LEGALITY = {
  COMPILED: ["QUALITY_MET", "QUALITY_NOT_MET", "REVISE"],
  HARD_FAILURE: ["FAILURE_CONFIRMED", "GATE_FALSE_POSITIVE"],
};

const TERMINAL_DISPOSITIONS = [
  "QUALITY_MET",
  "QUALITY_NOT_MET",
  "FAILURE_CONFIRMED",
  "GATE_FALSE_POSITIVE",
];

const REVIEW_REASON_CODES = [
  "REGISTER_BREAK",
  "MECHANIC_MISMATCH",
  "HIDDEN_STATE_RISK",
  "UNSUPPORTED_CLAIM",
  "CONTINUITY_BREAK",
  "DUPLICATE_IMAGE",
  "GENERIC_ABSTRACTION",
  "SENTIMENTALITY",
  "SLANG_REGISTER",
  "OMNISCIENCE",
  "UNEXPLAINED_JARGON",
  "CHORD_MISMATCH",
  "WEAK_CONSEQUENCE",
  "CLAIM_BUDGET_BREACH",
  "OTHER_WITH_NOTE",
];

export function legalDispositionsFor(compileStatus) {
  const list = DISPOSITION_LEGALITY[compileStatus];
  if (!list) throw new Error("UNKNOWN_COMPILE_STATUS");
  return [...list];
}

export function isTerminalDisposition(disposition) {
  return TERMINAL_DISPOSITIONS.includes(disposition);
}

export function assertLegalDisposition(compileStatus, disposition) {
  const legal = legalDispositionsFor(compileStatus);
  if (!legal.includes(disposition)) {
    throw new Error("ILLEGAL_DISPOSITION");
  }
}

export function reasonCodesCatalog() {
  return [...REVIEW_REASON_CODES];
}

/** UI projection: never includes AI provenance when judgeId is NONE. */
export function projectCandidateForLab(candidate, options = {}) {
  const judgeId = options.judgeId ?? "NONE";
  const base = {
    id: candidate.id,
    batchId: candidate.batchId,
    text: candidate.text,
    compileStatus: candidate.compileStatus,
    disposition: candidate.disposition,
    dispositionTerminal: candidate.dispositionTerminal,
    tags: candidate.tags ?? [],
    queueRank: candidate.queueRank,
    revision: candidate.revision,
    parentCandidateId: candidate.parentCandidateId,
    payload: candidate.payload ?? safeParse(candidate.payloadJson),
    legalDispositions: legalDispositionsFor(candidate.compileStatus),
    lane: laneFor(candidate),
  };
  if (judgeId !== "NONE" && candidate.aiEvidence) {
    return { ...base, aiEvidence: candidate.aiEvidence };
  }
  return base;
}

function laneFor(candidate) {
  if (candidate.compileStatus === "HARD_FAILURE") return "#failures";
  if ((candidate.tags ?? []).includes("#curious")) return "#curious";
  if (candidate.disposition === "QUALITY_MET") return "authenticated";
  if (candidate.disposition === "REVISE") return "revised";
  if (candidate.dispositionTerminal) return "authenticated";
  return "compliant";
}

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function summarizeQueue(candidates) {
  const rows = candidates ?? [];
  let unresolved = 0;
  let failures = 0;
  let curious = 0;
  let compliant = 0;
  let revised = 0;
  let authenticated = 0;
  for (const row of rows) {
    if (!row.dispositionTerminal) unresolved += 1;
    const lane = laneFor(row);
    if (lane === "#failures") failures += 1;
    else if (lane === "#curious") curious += 1;
    else if (lane === "revised") revised += 1;
    else if (lane === "authenticated") authenticated += 1;
    else compliant += 1;
  }
  return {
    unresolved,
    failures,
    curious,
    compliant,
    revised,
    authenticated,
    total: rows.length,
  };
}
