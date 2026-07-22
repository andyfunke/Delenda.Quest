"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./campaign-editor.module.css";
import { campaignPackFromDocumentText, extractPortableDocumentText } from "./document-import";
import {
  IMMUTABLE_SPINES,
  createCampaignPack,
  createEntry,
  createQuote,
  fromPortableCsv,
  llmPopulationBrief,
  normalizeCampaignPack,
  toPortableCsv,
  validationIssues,
  type CampaignEntry,
  type CampaignPack,
} from "./model";

const CAMPAIGNS_KEY = "delenda.quest.campaign-packs.v1";
const ACTIVE_CAMPAIGN_KEY = "delenda.quest.active-campaign-pack.v1";
type RemoteCampaign = CampaignPack & { ownerEmail: string; editable: boolean };

const download = (name: string, body: string, type: string) => {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";

export function CampaignEditor() {
  const [pack, setPack] = useState<CampaignPack>(() => createCampaignPack());
  const [selectedSpine, setSelectedSpine] = useState<string | null>(IMMUTABLE_SPINES[0].id);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [editable, setEditable] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");
    try {
      const packs = JSON.parse(window.localStorage.getItem(CAMPAIGNS_KEY) ?? "[]") as CampaignPack[];
      const saved = requestedId ? packs.find((candidate) => candidate.id === requestedId) : null;
      if (saved) setPack(normalizeCampaignPack(saved));
      if (params.get("mode") === "import") setNotice("Choose a portable campaign file to import.");
    } catch {
      setNotice("The saved campaign library could not be read. A new campaign is open.");
    }
    if (requestedId) {
      void fetch("/api/campaigns", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) return;
        const result = await response.json() as { campaigns?: RemoteCampaign[] };
        const remote = result.campaigns?.find((candidate) => candidate.id === requestedId);
        if (!remote) return;
        const { ownerEmail: owner, editable: mayEdit, ...portable } = remote;
        setPack(normalizeCampaignPack(portable));
        setOwnerEmail(owner);
        setEditable(mayEdit);
        if (!mayEdit) setNotice(`Friend-shared campaign by ${owner}. Inspect it, play it, or copy it before editing.`);
      }).catch(() => undefined);
    }
    setHydrated(true);
  }, []);

  const issues = useMemo(() => validationIssues(pack), [pack]);
  const spine = IMMUTABLE_SPINES.find((candidate) => candidate.id === selectedSpine) ?? null;
  const entries = pack.entries.filter((entry) => entry.spineId === selectedSpine);
  const populatedSpines = new Set(pack.entries.map((entry) => entry.spineId)).size;

  const update = <K extends keyof CampaignPack>(key: K, value: CampaignPack[K]) => {
    setPack((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const updateEntry = (entryId: string, patch: Partial<CampaignEntry>) => {
    setPack((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      entries: current.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry),
    }));
  };

  const persistLocal = (campaign: CampaignPack) => {
    const stored = JSON.parse(window.localStorage.getItem(CAMPAIGNS_KEY) ?? "[]") as CampaignPack[];
    const next = [...stored.filter((candidate) => candidate.id !== campaign.id), campaign];
    window.localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(next));
  };

  const save = async () => {
    if (!editable) {
      setNotice("Copy this friend-shared campaign before editing it.");
      return;
    }
    const saved = { ...pack, updatedAt: new Date().toISOString() };
    persistLocal(saved);
    setPack(saved);
    try {
      const response = await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(saved) });
      const result = await response.json() as { error?: string; ownerEmail?: string };
      if (response.status === 401) {
        setNotice("Campaign saved on this device. Sign in from Account to sync or share it with friends.");
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "Campaign sync failed.");
      setOwnerEmail(result.ownerEmail ?? ownerEmail);
      setNotice(saved.access === "friends" ? "Campaign saved and shared with your reciprocal friends." : "Campaign saved privately to My Campaigns.");
    } catch (error) {
      setNotice(`${error instanceof Error ? error.message : "Campaign sync failed."} A device copy was preserved.`);
    }
  };

  const copyCampaign = () => {
    const fresh = createCampaignPack();
    setPack({ ...pack, id: fresh.id, title: `${pack.title} — Copy`, access: "private", createdAt: fresh.createdAt, updatedAt: fresh.updatedAt });
    setEditable(true);
    setOwnerEmail(null);
    setNotice("Editable private copy created. Save it to add it to My Campaigns.");
  };

  const playCampaign = () => {
    if (issues.length) {
      setNotice("Resolve the validation report before playing this campaign.");
      return;
    }
    const playable = { ...pack, updatedAt: new Date().toISOString() };
    persistLocal(playable);
    window.localStorage.setItem(ACTIVE_CAMPAIGN_KEY, JSON.stringify(playable));
    window.location.href = `/?campaignPack=${encodeURIComponent(playable.id)}`;
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    if (extension === "docx" || extension === "doc" || extension === "pdf") {
      const sourceDocument = { name: file.name, type: file.type || extension || "application/octet-stream", addedAt: new Date().toISOString() };
      try {
        const text = await extractPortableDocumentText(file);
        const imported = campaignPackFromDocumentText(text);
        imported.sourceDocuments = [...imported.sourceDocuments, sourceDocument];
        setPack(imported);
        setEditable(true);
        setOwnerEmail(null);
        setSelectedSpine(IMMUTABLE_SPINES[0].id);
        setNotice(`${file.name} imported. The embedded campaign payload passed the immutable-spine boundary.`);
      } catch (error) {
        setPack((current) => ({
          ...current,
          sourceDocuments: [...current.sourceDocuments, sourceDocument],
          updatedAt: new Date().toISOString(),
        }));
        setNotice(`${error instanceof Error ? error.message : "The document could not be normalized."} Source attached; use the LLM brief to return canonical CSV or JSON.`);
        setShowBrief(true);
      }
      return;
    }
    try {
      const text = await file.text();
      const imported = extension === "json" ? normalizeCampaignPack(JSON.parse(text)) : fromPortableCsv(text);
      setPack(imported);
      setEditable(true);
      setOwnerEmail(null);
      setSelectedSpine(IMMUTABLE_SPINES[0].id);
      setNotice(`${file.name} imported. Immutable spines were preserved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Campaign import failed.");
    }
  };

  const copyBrief = async () => {
    await navigator.clipboard.writeText(llmPopulationBrief(pack));
    setNotice("LLM population instruction set copied.");
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.logo} href="/"><span>DELENDA</span><i>.</i>QUEST</Link>
        <nav><Link href="/">RETURN TO WAR</Link><Link href="/account">ACCOUNT</Link><Link className={styles.active} href="/campaign-editor">CAMPAIGN EDITOR</Link></nav>
        <div><span>OPEN SOURCE AUTHORING SURFACE</span><b>FORMAT V1 // SPINES LOCKED</b></div>
      </header>

      <div className={styles.frame}>
        <section className={styles.hero}>
          <span>CAMPAIGN EDITOR // DETERMINISTIC SUBSTRATE EXPOSED</span>
          <h1>Write the war. Keep the arithmetic.</h1>
          <p>The simulation spines are immutable. Everything that gives them a world, a voice, a history, and a reason to hurt can be replaced.</p>
        </section>

        <section className={styles.report}>
          <div><small>IMMUTABLE SPINES</small><b>{IMMUTABLE_SPINES.length} / {IMMUTABLE_SPINES.length}</b></div>
          <div><small>POPULATED SPINES</small><b>{populatedSpines} / {IMMUTABLE_SPINES.length}</b></div>
          <div><small>CAMPAIGN RECORDS</small><b>{pack.entries.length}</b></div>
          <div><small>QUOTE CANON</small><b>{pack.quoteCanon.length}</b></div>
          <div className={issues.length ? styles.reportWarn : styles.reportGood}><small>VALIDATION</small><b>{issues.length ? `${issues.length} OPEN` : "READY"}</b></div>
        </section>

        {notice && <div className={styles.notice} role="status">{notice}</div>}

        <section className={styles.identityWindow}>
          <header><span>CAMPAIGN IDENTITY</span><b>{pack.id}</b></header>
          <div>
            <label><span>CAMPAIGN NAME</span><input value={pack.title} onChange={(event) => update("title", event.target.value)}/></label>
            <label><span>PREMISE</span><textarea value={pack.description} onChange={(event) => update("description", event.target.value)} placeholder="What is this war about, and what kind of state is being spent?"/></label>
            <label className={styles.access}><span>ACCESS</span><select value={pack.access} onChange={(event) => update("access", event.target.value === "friends" ? "friends" : "private")}><option value="private">Only me</option><option value="friends">Share with friends</option></select></label>
          </div>
        </section>

        <section className={styles.editorWindow}>
          <header><span>DETERMINISTIC SPINE MANAGER</span><b>SELECT AGAIN TO DESELECT</b></header>
          <div className={styles.editorLayout}>
            <nav aria-label="Immutable campaign spines">
              {IMMUTABLE_SPINES.map((candidate, index) => {
                const count = pack.entries.filter((entry) => entry.spineId === candidate.id).length;
                return <button className={candidate.id === selectedSpine ? styles.selected : ""} onClick={() => setSelectedSpine((current) => current === candidate.id ? null : candidate.id)} key={candidate.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{candidate.label}</b><small>{count} CAMPAIGN RECORD{count === 1 ? "" : "S"}</small></div><i>LOCKED</i></button>;
              })}
            </nav>

            <article className={styles.inspector}>
              {spine ? <>
                <div className={styles.path}>CAMPAIGN // IMMUTABLE SPINE // {spine.id.toUpperCase()}</div>
                <h2>{spine.label}</h2>
                <section className={styles.contract}><span>SPINE CONTRACT // IMMUTABLE</span><b>{spine.contract}</b><p>AUTHORING SURFACE // {spine.accepts}</p><code>{spine.schema}</code></section>
                <div className={styles.entryList}>
                  {entries.map((entry) => <section key={entry.id}>
                    <header><span>CAMPAIGN RECORD // {entry.id.slice(0, 8).toUpperCase()}</span><button onClick={() => setPack((current) => ({ ...current, entries: current.entries.filter((candidate) => candidate.id !== entry.id), updatedAt: new Date().toISOString() }))}>REMOVE</button></header>
                    <div className={styles.entryGrid}>
                      <label><span>TITLE</span><input value={entry.title} onChange={(event) => updateEntry(entry.id, { title: event.target.value })}/></label>
                      <label><span>TRIGGER OR GATE</span><input value={entry.trigger} onChange={(event) => updateEntry(entry.id, { trigger: event.target.value })} placeholder="Optional deterministic eligibility statement"/></label>
                      <label className={styles.full}><span>FLAVOR TEXT</span><textarea value={entry.flavor} onChange={(event) => updateEntry(entry.id, { flavor: event.target.value })} placeholder="Narrative may explain. Narrative never resolves."/></label>
                      <label className={`${styles.full} ${styles.ruleData}`}><span>ENGINE PARAMETERS // RULE DATA JSON</span><textarea spellCheck={false} value={entry.ruleData} onChange={(event) => updateEntry(entry.id, { ruleData: event.target.value })} placeholder={spine.schema}/><small>Narrative never executes. Parameters must be valid JSON matching the locked spine schema.</small></label>
                      <label><span>OWNED EFFECTS // EXACT</span><textarea value={entry.ownedEffects} onChange={(event) => updateEntry(entry.id, { ownedEffects: event.target.value })} placeholder="One exact effect per line"/></label>
                      <label><span>WAR EFFECTS // CONTINGENT</span><textarea value={entry.contingentEffects} onChange={(event) => updateEntry(entry.id, { contingentEffects: event.target.value })} placeholder="One bounded outcome per line"/></label>
                    </div>
                  </section>)}
                  {!entries.length && <p className={styles.empty}>NO CAMPAIGN RECORDS IN THIS SPINE</p>}
                </div>
                <button className={styles.addEntry} onClick={() => setPack((current) => ({ ...current, entries: [...current.entries, createEntry(spine.id)], updatedAt: new Date().toISOString() }))}>ADD CAMPAIGN RECORD TO {spine.label.toUpperCase()}</button>
              </> : <div className={styles.noSelection}><b>NO SPINE SELECTED</b><p>Select a spine to edit its replaceable campaign records. The engine contract remains visible and locked.</p></div>}
            </article>
          </div>
          <footer>SPINES DEFINE WHAT THE ENGINE REQUIRES // RULE DATA DEFINES WHAT EXECUTES // FLAVOR DEFINES WHAT THE CAMPAIGN SAYS</footer>
        </section>

        <details className={styles.quoteCanon}>
          <summary>ADVANCED // QUOTE CANON // TECHNICALLY ACCESSIBLE</summary>
          <div className={styles.quoteIntro}><b>Quote Canon persists across campaign runs.</b><p>It is not tied to a seed and is not presented as routine editing. Changes here alter the campaign&apos;s philosophical corpus.</p><button onClick={() => setPack((current) => ({ ...current, quoteCanon: [...current.quoteCanon, createQuote()], updatedAt: new Date().toISOString() }))}>ADD CANONICAL QUOTE</button></div>
          {pack.quoteCanon.map((quote) => <article key={quote.id}><textarea value={quote.text} onChange={(event) => setPack((current) => ({ ...current, quoteCanon: current.quoteCanon.map((candidate) => candidate.id === quote.id ? { ...candidate, text: event.target.value } : candidate), updatedAt: new Date().toISOString() }))} placeholder="Quote text"/><input value={quote.attribution} onChange={(event) => setPack((current) => ({ ...current, quoteCanon: current.quoteCanon.map((candidate) => candidate.id === quote.id ? { ...candidate, attribution: event.target.value } : candidate), updatedAt: new Date().toISOString() }))} placeholder="Attribution"/><input value={quote.tags} onChange={(event) => setPack((current) => ({ ...current, quoteCanon: current.quoteCanon.map((candidate) => candidate.id === quote.id ? { ...candidate, tags: event.target.value } : candidate), updatedAt: new Date().toISOString() }))} placeholder="Tags"/><button onClick={() => setPack((current) => ({ ...current, quoteCanon: current.quoteCanon.filter((candidate) => candidate.id !== quote.id), updatedAt: new Date().toISOString() }))}>REMOVE</button></article>)}
        </details>

        <section className={styles.transferWindow}>
          <header><span>PORTABLE CAMPAIGN INSTRUCTION SET</span><b>CSV // JSON // DOCUMENT HANDOFF</b></header>
          <div className={styles.transferGrid}>
            <section><h3>EXPORT</h3><p>Export a canonical CSV for another player or an LLM. It contains locked spine contracts, executable rule data, flavor records, and Quote Canon.</p><div><button onClick={() => download(`${slug(pack.title)}.dqcampaign.csv`, toPortableCsv(pack), "text/csv;charset=utf-8")}>EXPORT CSV</button><button onClick={() => download(`${slug(pack.title)}.dqcampaign.json`, JSON.stringify(pack, null, 2), "application/json")}>EXPORT JSON</button></div></section>
            <section><h3>IMPORT OR SOURCE</h3><p>CSV and JSON populate directly. DOCX and PDF recover an embedded canonical payload when possible, with LLM normalization as the fallback.</p><label className={styles.fileButton}>CHOOSE CAMPAIGN FILE<input type="file" accept=".csv,.json,.doc,.docx,.pdf" onChange={importFile}/></label>{pack.sourceDocuments.map((document) => <small key={`${document.name}-${document.addedAt}`}>{document.name} // ATTACHED SOURCE</small>)}</section>
            <section><h3>LLM POPULATION BRIEF</h3><p>Copy the exact scaffold, current content, immutable rules, and required return schema into any LLM.</p><button onClick={copyBrief}>COPY INSTRUCTION SET</button><button onClick={() => setShowBrief((current) => !current)}>{showBrief ? "HIDE" : "INSPECT"} BRIEF</button></section>
          </div>
          {showBrief && <textarea className={styles.brief} readOnly value={llmPopulationBrief(pack)}/>} 
        </section>

        <section className={styles.validationWindow}>
          <header><span>VALIDATION REPORT</span><b>{issues.length ? `${issues.length} OPEN ITEMS` : "READY TO SHARE"}</b></header>
          {issues.length ? <ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p>Every spine contains content, required campaign fields are present, and the portable schema is valid.</p>}
        </section>

        <footer className={styles.actions}>
          <div><b>{hydrated ? editable ? "AUTHORING RECORD READY" : "FRIEND-SHARED RECORD // READ ONLY" : "OPENING AUTHORING RECORD"}</b><small>{ownerEmail ? `OWNER ${ownerEmail} // ` : ""}{pack.access === "friends" ? "FRIEND ACCESS" : "PRIVATE CAMPAIGN"}</small></div>
          <Link href="/account">CANCEL</Link>
          <button onClick={() => { setPack(createCampaignPack()); setEditable(true); setOwnerEmail(null); }}>NEW BLANK CAMPAIGN</button>
          {!editable && <button onClick={copyCampaign}>COPY TO MY CAMPAIGNS</button>}
          <button disabled={issues.length > 0} onClick={playCampaign}>PLAY CAMPAIGN</button>
          <button className={styles.primary} disabled={!editable} onClick={() => void save()}>SAVE TO MY CAMPAIGNS</button>
        </footer>
      </div>
    </main>
  );
}
