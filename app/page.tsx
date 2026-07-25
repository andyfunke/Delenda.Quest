import type { Metadata } from "next";
import Link from "next/link";
import { APHORISMS } from "./aphorisms";
import { LandingRedirect } from "./LandingRedirect";

export const metadata: Metadata = {
  title: "DELENDA.QUEST // Attritional War Simulation",
  description:
    "A fantasy-futurist war simulation of daily command, operational manoeuvre, transparent calculations, and compounding consequences.",
};

const landingQuoteIds = new Set(["Q002", "Q016", "Q021", "Q030", "Q103"]);
const landingQuotes = APHORISMS.filter((quote) => landingQuoteIds.has(quote.id));

const telemetry = [
  ["DAY", "01", "CAMPAIGN OPEN"],
  ["ORDERS", "3", "AVAILABLE"],
  ["FRONT", "0.0 KM", "CONTESTED"],
  ["READINESS", "78%", "SERVICEABLE"],
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <LandingRedirect />
      <div className="landing-shell">
        <header className="landing-header">
          <Link className="landing-brand" href="/" aria-label="Delenda Quest home">
            DELENDA <em>QUEST</em>
          </Link>
          <nav aria-label="Primary navigation">
            <a href="/game">CAMPAIGN</a>
            <a href="/game?wiki=resolution&standalone=1">FIELD MANUAL</a>
            <a href="/game?account=1">ACCOUNT</a>
          </nav>
          <span className="landing-system">
            <i />
            CAMPAIGN SYSTEM ONLINE
          </span>
        </header>

        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <span className="landing-kicker">
              ATTRITIONAL WAR SIMULATION // DAILY COMMAND
            </span>
            <h1 id="landing-title">
              Every order changes what the war can <em>afford.</em>
            </h1>
            <p>
              Delenda Quest is a fantasy-futurist war simulation of daily prompt
              selection, operational manoeuvre, and compounding attrition. You do
              not move every piece. You alter the conditions under which the
              front can function.
            </p>
            <div className="landing-actions">
              <a className="landing-primary" href="/game">
                ENTER CAMPAIGN <span>→</span>
              </a>
              <a className="landing-secondary" href="/game?wiki=resolution&standalone=1">
                READ THE FIELD MANUAL
              </a>
            </div>
            <small>
              ONE CAMPAIGN // TWO COMMAND INTERFACES // CALCULATIONS ALWAYS
              VISIBLE
            </small>
          </div>

          <aside className="landing-telemetry" aria-label="Campaign telemetry">
            <header>
              <span>OPENING STATE</span>
              <b>LIVE MODEL</b>
            </header>
            <div className="landing-telemetry-clock">
              <small>DAY RESOLVES IN</small>
              <strong>08:14:32</strong>
            </div>
            <div className="landing-telemetry-grid">
              {telemetry.map(([label, value, note]) => (
                <div key={label}>
                  <small>{label}</small>
                  <b>{value}</b>
                  <span>{note}</span>
                </div>
              ))}
            </div>
            <footer>
              <span>FRIENDLY CAPACITY</span>
              <i>
                <b />
              </i>
              <span>ENEMY PRESSURE</span>
            </footer>
          </aside>
        </section>

        <section className="landing-system-section" aria-labelledby="system-title">
          <header>
            <span>THE CAMPAIGN MODEL // 01</span>
            <div>
              <h2 id="system-title">A war of visible consequences.</h2>
              <p>
                The front advances through state, not scripted repetition. Every
                choice exposes its arithmetic before you commit it.
              </p>
            </div>
          </header>
          <div className="landing-system-grid">
            <article>
              <span>01 // DAILY COMMAND</span>
              <h3>Spend a limited order budget.</h3>
              <p>
                Select directives across production, military, diplomacy, and
                doctrine, then commit one operational manoeuvre against the
                campaign problem in front of you.
              </p>
              <small>INPUT // ORDERS + MANOEUVRE</small>
            </article>
            <article>
              <span>02 // TRANSPARENT ATTRITION</span>
              <h3>See what every choice touches.</h3>
              <p>
                Capacity, readiness, supply, legitimacy, resistance, and front
                pressure remain legible. Effects stack, persist, and collide
                across the same underlying simulation.
              </p>
              <small>OUTPUT // NAMED METRICS</small>
            </article>
            <article>
              <span>03 // CAMPAIGN MEMORY</span>
              <h3>Content is drawn without replacement.</h3>
              <p>
                Situations, opportunities, and quotations remain scarce for each
                player until the available corpus is exhausted. The campaign
                remembers what it has already shown you.
              </p>
              <small>ROTATION // ACCOUNT LEDGER</small>
            </article>
          </div>
        </section>

        <section className="landing-ava" aria-labelledby="ava-title">
          <div className="landing-ava-copy">
            <span>AVA MOORE // PATTERN ANALYSIS DIRECTORATE</span>
            <h2 id="ava-title">The assistant studies the commander.</h2>
            <p>
              Ava is both interface and participant. She does not operate
              through natural language. Programmatically enhanced command
              recognition lets you request advice, surface secondary missions,
              inspect campaign calculations, traverse the field manual, and
              issue orders.
            </p>
            <blockquote>
              “The commander studies the map. The machine studies the commander.”
              <cite>AVA MOORE, PATTERN ANALYSIS DIRECTORATE</cite>
            </blockquote>
          </div>
          <div className="landing-terminal" aria-label="Ava terminal example">
            <header>
              <span>AVA // COMMAND ENVIRONMENT</span>
              <i>CONNECTED</i>
            </header>
            <p>
              <b>YOU</b>
              <span>advise me on the secondary missions</span>
            </p>
            <p>
              <b>AVA</b>
              <span>
                NATIONAL AND DIPLOMATIC MISSION TREES ARE ACTIVE. THEIR COSTS
                ARE VISIBLE. THEIR COLLISIONS ARE NOT INCIDENTAL.
              </span>
            </p>
            <dl>
              <div>
                <dt>INTERPRETATION</dt>
                <dd>SECONDARY OBJECTIVES</dd>
              </div>
              <div>
                <dt>CONFIDENCE</dt>
                <dd>0.96</dd>
              </div>
              <div>
                <dt>ACTION</dt>
                <dd>ADVISE</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="landing-quotes" aria-labelledby="quotes-title">
          <header>
            <div>
              <span>STRATEGIC EPIGRAPH CANON // QUOTE BOARD</span>
              <h2 id="quotes-title">The archive is part of the war.</h2>
            </div>
            <p>
              Human authored content with a procedural generation engine.
              Original quotations and flavor text produce a thematic aesthetic.
            </p>
          </header>
          <div className="landing-quote-grid">
            {landingQuotes.map((quote, index) => (
              <blockquote className={index === 0 ? "featured" : undefined} key={quote.id}>
                <span>{quote.id}</span>
                <p>“{quote.text}”</p>
                <cite>{quote.source}</cite>
              </blockquote>
            ))}
          </div>
          <footer>
            <span>ROTATION // WITHOUT REPLACEMENT</span>
            <span>ARCHIVE // ACCOUNT-SPECIFIC</span>
            <a href="/game">ACCESS THROUGH AVA →</a>
          </footer>
        </section>

        <section className="landing-final" aria-labelledby="final-title">
          <span>CAMPAIGN ENTRY // DAY 01</span>
          <h2 id="final-title">The day will resolve.</h2>
          <p>
            You receive three orders, one operational problem, and a front that
            continues to consume capacity whether or not you are ready.
          </p>
          <a className="landing-primary" href="/game">
            ASSUME COMMAND <span>→</span>
          </a>
        </section>

        <footer className="landing-footer">
          <Link className="landing-brand" href="/">
            DELENDA <em>QUEST</em>
          </Link>
          <span>FANTASY-FUTURIST ATTRITIONAL WAR SIMULATION</span>
          <nav aria-label="Footer navigation">
            <a href="/game?wiki=resolution&standalone=1">FIELD MANUAL</a>
            <a href="/game?account=1">ACCOUNT</a>
            <a href="/game">CAMPAIGN</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
