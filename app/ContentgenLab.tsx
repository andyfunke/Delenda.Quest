"use client";

import { useEffect, useId, useState, useTransition } from "react";

type QueueSummary = {
  unresolved: number;
  failures: number;
  curious: number;
  compliant: number;
  revised: number;
  authenticated: number;
  total: number;
};

type LabCandidate = {
  id: string;
  text: string;
  compileStatus: "COMPILED" | "HARD_FAILURE";
  disposition: string | null;
  dispositionTerminal: boolean;
  revision: number;
  parentCandidateId: string | null;
  legalDispositions: string[];
  lane: string;
  payload: Record<string, unknown> | null;
  tags: string[];
};

type BatchView = {
  batch: {
    id: string;
    medium: string;
    sourceVersion: string;
    seed: number;
    manifestHash: string;
    status: string;
    unresolvedCandidateCount: number;
  };
  queue: QueueSummary;
  candidates: LabCandidate[];
  reasonCodes: string[];
  judgeId: string;
  aiProvenanceVisible: boolean;
};

const apiError = (value: unknown, fallback: string) => {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") {
    return value.error;
  }
  return fallback;
};

export function ContentgenLab() {
  const statusId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready.");
  const [batchView, setBatchView] = useState<BatchView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    medium: "ava",
    sourceVersion: "contentgen-inventory/v1",
    seed: 7,
    samplePolicy: "uniform" as "uniform" | "curiosity-weighted",
    batchSize: 4,
  });
  const [disposition, setDisposition] = useState("QUALITY_MET");
  const [reasonCode, setReasonCode] = useState("WEAK_CONSEQUENCE");
  const [notes, setNotes] = useState("");
  const [revisedText, setRevisedText] = useState("");

  const selected = batchView?.candidates.find((row) => row.id === selectedId) ?? null;
  const parent =
    selected?.parentCandidateId &&
    batchView?.candidates.find((row) => row.id === selected.parentCandidateId);

  const announce = (message: string) => {
    setStatus(message);
  };

  const loadBatch = async (batchId: string) => {
    const response = await fetch(`/api/admin/contentgen/batches/${batchId}`, {
      cache: "no-store",
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      setError(apiError(body, "Unable to load batch."));
      return;
    }
    const view = body as BatchView;
    setBatchView(view);
    setSelectedId(view.candidates[0]?.id ?? null);
    announce(
      `Batch ${view.batch.id.slice(0, 8)} loaded. ${view.queue.unresolved} unresolved.`,
    );
  };

  useEffect(() => {
    // Accessibility: keep live region honest on mount.
    announce("Contentgen Lab ready. AI provenance hidden (judgeId NONE).");
  }, []);

  const createBatch = () => {
    startTransition(async () => {
      setError("");
      const response = await fetch("/api/admin/contentgen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(apiError(body, "Batch creation failed."));
        return;
      }
      const created = body as { batch: { id: string } };
      await loadBatch(created.batch.id);
    });
  };

  const submitReview = () => {
    if (!selected || !batchView) return;
    startTransition(async () => {
      setError("");
      const response = await fetch(
        `/api/admin/contentgen/candidates/${selected.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedRevision: selected.revision,
            idempotencyKey: `lab:${selected.id}:${selected.revision}:${disposition}`,
            disposition,
            reasonCodes: [reasonCode],
            notes: notes || null,
            revisedText: disposition === "REVISE" ? revisedText : null,
          }),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(apiError(body, "Review failed."));
        announce(apiError(body, "Review conflict."));
        return;
      }
      await loadBatch(batchView.batch.id);
      announce(`Disposition ${disposition} recorded.`);
    });
  };

  const closeBatch = () => {
    if (!batchView) return;
    startTransition(async () => {
      setError("");
      const response = await fetch(
        `/api/admin/contentgen/batches/${batchView.batch.id}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "close" }),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(apiError(body, "Close failed."));
        announce(apiError(body, "Close blocked."));
        return;
      }
      await loadBatch(batchView.batch.id);
      announce("Batch closed.");
    });
  };

  const exportBatch = () => {
    if (!batchView) return;
    startTransition(async () => {
      setError("");
      const response = await fetch("/api/admin/contentgen/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId: batchView.batch.id }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(apiError(body, "Export failed."));
        return;
      }
      const exported = body as { artifactHash: string };
      announce(`Exported ${exported.artifactHash.slice(0, 12)}.`);
    });
  };

  return (
    <div className="module contentgen-lab" data-module="CONTENTGEN-LAB">
      <header>
        <span className="eyebrow">Admin curation // staging only // no runtime authority</span>
        <h1>Contentgen Lab</h1>
        <p>
          Generate seeded batches from frozen staging manifests, authenticate every
          candidate, confirm hard failures, and create reductions. Completion stays
          disabled while any candidate — including revision children — remains unresolved.
        </p>
        <p id={statusId} className="contentgen-lab-status" role="status" aria-live="polite">
          {status}
          {pending ? " Working…" : ""}
        </p>
        {error ? <p className="contentgen-lab-error">{error}</p> : null}
      </header>

      <section className="contentgen-lab-grid" aria-label="Batch creation">
        <article>
          <h2>Batch creation</h2>
          <label>
            Medium
            <input
              value={form.medium}
              onChange={(event) => setForm({ ...form, medium: event.target.value })}
            />
          </label>
          <label>
            Source version
            <input
              value={form.sourceVersion}
              onChange={(event) =>
                setForm({ ...form, sourceVersion: event.target.value })
              }
            />
          </label>
          <label>
            Seed
            <input
              type="number"
              value={form.seed}
              onChange={(event) =>
                setForm({ ...form, seed: Number(event.target.value) })
              }
            />
          </label>
          <label>
            Sample policy
            <select
              value={form.samplePolicy}
              onChange={(event) =>
                setForm({
                  ...form,
                  samplePolicy: event.target.value as typeof form.samplePolicy,
                })
              }
            >
              <option value="uniform">uniform</option>
              <option value="curiosity-weighted">curiosity-weighted</option>
            </select>
          </label>
          <label>
            Batch size
            <input
              type="number"
              min={1}
              value={form.batchSize}
              onChange={(event) =>
                setForm({ ...form, batchSize: Number(event.target.value) })
              }
            />
          </label>
          <button type="button" onClick={createBatch}>
            Create batch from staging
          </button>
          <p className="contentgen-lab-note">
            Browser never enumerates. judgeId is locked to NONE in this epoch.
          </p>
        </article>

        <article>
          <h2>Queue summary</h2>
          {batchView ? (
            <div className="contentgen-lab-queue" aria-label="Queue counts">
              {[
                ["unresolved", batchView.queue.unresolved],
                ["#failures", batchView.queue.failures],
                ["#curious", batchView.queue.curious],
                ["compliant", batchView.queue.compliant],
                ["revised", batchView.queue.revised],
                ["authenticated", batchView.queue.authenticated],
              ].map(([label, value]) => (
                <div className="admin-row" key={label}>
                  <b>{label}</b>
                  <span>{value}</span>
                </div>
              ))}
              <div className="admin-row">
                <b>status</b>
                <span>{batchView.batch.status}</span>
              </div>
            </div>
          ) : (
            <p>No batch loaded.</p>
          )}
        </article>
      </section>

      {batchView ? (
        <section className="contentgen-lab-grid" aria-label="Review workspace">
          <article className="contentgen-lab-wide">
            <h2>Candidates</h2>
            <ul className="contentgen-lab-list">
              {batchView.candidates.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={row.id === selectedId ? "is-selected" : undefined}
                    onClick={() => {
                      setSelectedId(row.id);
                      setDisposition(row.legalDispositions[0] ?? "QUALITY_MET");
                      announce(`Selected ${row.id}. Lane ${row.lane}.`);
                    }}
                  >
                    <b>{row.lane}</b>
                    <span>{row.compileStatus}</span>
                    <span>{row.disposition ?? "OPEN"}</span>
                    <em>{row.text}</em>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article>
            <h2>Review card</h2>
            {selected ? (
              <>
                <p className="contentgen-lab-text">{selected.text}</p>
                <pre className="contentgen-lab-payload">
                  {JSON.stringify(
                    {
                      semanticPlan: selected.payload,
                      compileStatus: selected.compileStatus,
                      tags: selected.tags,
                      parentCandidateId: selected.parentCandidateId,
                      revision: selected.revision,
                    },
                    null,
                    2,
                  )}
                </pre>
                {selected.parentCandidateId ? (
                  <div className="contentgen-lab-reduction">
                    <h3>Reduction</h3>
                    <div className="contentgen-lab-side-by-side">
                      <div>
                        <b>Parent (immutable)</b>
                        <p>{parent ? parent.text : selected.parentCandidateId}</p>
                      </div>
                      <div>
                        <b>Child</b>
                        <p>{selected.text}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <label>
                  Disposition
                  <select
                    value={disposition}
                    onChange={(event) => setDisposition(event.target.value)}
                  >
                    {selected.legalDispositions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Reason code
                  <select
                    value={reasonCode}
                    onChange={(event) => setReasonCode(event.target.value)}
                  >
                    {batchView.reasonCodes.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notes
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                  />
                </label>
                {disposition === "REVISE" ? (
                  <label>
                    Revised text
                    <textarea
                      value={revisedText}
                      onChange={(event) => setRevisedText(event.target.value)}
                      rows={3}
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={selected.dispositionTerminal}
                >
                  Authenticate disposition
                </button>
              </>
            ) : (
              <p>Select a candidate.</p>
            )}
          </article>

          <article>
            <h2>Completion / export</h2>
            <p>
              Unresolved: {batchView.batch.unresolvedCandidateCount}. Completion
              remains disabled until every candidate including revision children
              carries an authenticated terminal disposition.
            </p>
            <button
              type="button"
              onClick={closeBatch}
              disabled={batchView.batch.unresolvedCandidateCount > 0}
            >
              Close batch
            </button>
            <button
              type="button"
              onClick={exportBatch}
              disabled={batchView.batch.status !== "closed"}
            >
              Export authenticated receipts
            </button>
            <p className="contentgen-lab-note">
              Promotion is repository-manifest only. judgeId={batchView.judgeId}.
              AI provenance visible: {String(batchView.aiProvenanceVisible)}.
            </p>
          </article>
        </section>
      ) : null}
    </div>
  );
}
