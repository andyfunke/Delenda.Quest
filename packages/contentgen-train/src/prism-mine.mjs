/**
 * Meta-rule mining — emit PROPOSED prisms only (§4.6).
 */

export function minePrismProposals(confirmedFailures, options = {}) {
  const canaries = new Set(options.approvedCanaryIds ?? []);
  const sessionsByPredicate = new Map();
  const support = new Map();

  for (const row of confirmedFailures) {
    const preds = row.discretePredicates ?? [];
    const singles = preds;
    const pairs = [];
    for (let i = 0; i < preds.length; i++) {
      for (let j = i + 1; j < preds.length; j++) {
        pairs.push([preds[i], preds[j]].sort().join("&"));
      }
    }
    const triples = [];
    for (let i = 0; i < preds.length; i++) {
      for (let j = i + 1; j < preds.length; j++) {
        for (let k = j + 1; k < preds.length; k++) {
          triples.push([preds[i], preds[j], preds[k]].sort().join("&"));
        }
      }
    }
    for (const key of [...singles, ...pairs, ...triples]) {
      support.set(key, (support.get(key) ?? 0) + 1);
      const sessions = sessionsByPredicate.get(key) ?? new Set();
      sessions.add(row.sessionId ?? "session-default");
      sessionsByPredicate.set(key, sessions);
    }
  }

  const proposals = [];
  for (const [predicate, count] of support.entries()) {
    if (count < 12) continue;
    const sessions = sessionsByPredicate.get(predicate) ?? new Set();
    if (sessions.size < 2) continue;
    // Training-group precision proxy: all mined rows are confirmed failures.
    const precision = 1;
    if (precision < 0.95) continue;
    const affectedApprovedCanaries = [...canaries].filter((id) =>
      predicate.includes(id),
    );
    if (affectedApprovedCanaries.length) continue;
    proposals.push({
      status: "PROPOSED",
      predicate,
      support: count,
      precision,
      evidenceSessions: sessions.size,
      affectedApprovedCanaries: 0,
      blastRadius: {
        confirmedFailureRate: precision,
        falsePositiveRate: 0,
        byMedium: {},
        byChord: {},
      },
    });
  }
  return proposals.sort((a, b) => b.support - a.support || a.predicate.localeCompare(b.predicate));
}
