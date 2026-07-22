"use client";

import { useState } from "react";
import { CONCEPTS } from "./concepts";
import { openWikiApplet } from "./wiki-events";

export type BubbletteDetail = {
  label: string;
  value: string;
  conceptId?: string;
  tone?: "gain" | "loss" | "neutral";
  control?: { label: string; module: string; family?: string };
};

type Props = {
  id: string;
  title: string;
  summary: string;
  details?: BubbletteDetail[];
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
  control?: { label: string; module: string; family?: string };
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function Bubblette({
  id,
  title,
  summary,
  details = [],
  children,
  className = "",
  panelClassName = "",
  control: controlOverride,
}: Props) {
  const [pinned, setPinned] = useState(false),
    [dismissed, setDismissed] = useState(false);
  const concept = CONCEPTS[id];
  const control = controlOverride ?? concept?.control;
  const runDestination = (
    destination: { module: string; family?: string } | undefined,
  ) => {
    if (!destination) return;
    if (destination.family)
      window.dispatchEvent(
        new CustomEvent("open-family", { detail: destination.family }),
      );
    else
      window.dispatchEvent(
        new CustomEvent("open-module", { detail: destination.module }),
      );
    setPinned(false);
  };
  const runControl = () => runDestination(control);
  const toggle = () => {
    setDismissed(false);
    setPinned((value) => !value);
  };
  const close = () => {
    setPinned(false);
    setDismissed(true);
  };
  return (
    <div
      className={`bubblette ${pinned ? "pinned" : ""} ${dismissed ? "dismissed" : ""} ${className}`}
      role="button"
      tabIndex={0}
      aria-expanded={pinned}
      onMouseLeave={() => setDismissed(false)}
      onClick={(event) => {
        if (
          event.target === event.currentTarget ||
          !event.currentTarget
            .querySelector(".bubblette-panel")
            ?.contains(event.target as Node)
        )
          toggle();
      }}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          toggle();
        }
      }}
    >
      {children}
      {pinned ? (
        <button
          className="bubblette-scrim"
          aria-label="Close pinned inspection"
          onClick={(event) => {
            event.stopPropagation();
            close();
          }}
        />
      ) : null}
      <section
        className={`bubblette-panel ${panelClassName}`}
        role={pinned ? "dialog" : undefined}
        aria-modal={pinned || undefined}
        onClick={(event) => event.stopPropagation()}
        aria-label={`${title} inspection`}
      >
        <header>
          <div>
            <small>{pinned ? "PINNED INSPECTION" : "INSPECTION"}</small>
            <b>{title}</b>
          </div>
          <button aria-label="Unpin bubblette" onClick={close}>
            ×
          </button>
        </header>
        <p>{summary}</p>
        {details.length ? (
          <dl>
            {details.map((detail) => {
              const detailId = detail.conceptId ?? id,
                detailConcept = CONCEPTS[detailId],
                detailControl = detail.control ?? detailConcept?.control;
              return (
                <div
                  className={detail.tone ?? "neutral"}
                  key={`${detail.label}-${detail.value}`}
                >
                  <dt>
                    <button onClick={() => openWikiApplet(detailId)}>
                      {detail.label} ↗
                    </button>
                  </dt>
                  <dd>
                    <span>{detail.value}</span>
                    {detailControl ? (
                      <button
                        className="bubblette-detail-control"
                        onClick={() => runDestination(detailControl)}
                      >
                        CONTROL // {detailControl.label.toUpperCase()} →
                      </button>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
        <div className="bubblette-actions">
          {control ? (
            <button onClick={runControl}>
              CONTROL // {control.label.toUpperCase()} →
            </button>
          ) : null}
          <button onClick={() => openWikiApplet(id)}>
            FIELD MANUAL // {title.toUpperCase()} →
          </button>
        </div>
        {concept?.related.length ? (
          <nav aria-label="Related dependencies">
            <small>DEPENDENCIES</small>
            {concept.related.map((related) => {
              const relatedConcept = CONCEPTS[related];
              return (
                <button
                  key={related}
                  onClick={() =>
                    openWikiApplet(relatedConcept?.id ?? slug(related))
                  }
                >
                  {relatedConcept?.label ?? related}
                </button>
              );
            })}
          </nav>
        ) : null}
      </section>
    </div>
  );
}

export function ConceptBubblette({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const concept = CONCEPTS[id];
  if (!concept) return <>{children}</>;
  return (
    <Bubblette
      id={id}
      title={concept.label}
      summary={concept.definition}
      className="inline-concept-bubblette"
      details={[
        ...(concept.normal
          ? [{ label: "NORMAL", value: concept.normal, conceptId: id }]
          : []),
        { label: "CONSEQUENCE", value: concept.consequence, conceptId: id },
      ]}
    >
      {children}
    </Bubblette>
  );
}
