"use client";

import { useEffect, useId, useState } from "react";
import { CONCEPTS } from "./concepts";
import { FIELD_MANUAL_CATALOG } from "./FieldManual";
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
  const manualId = FIELD_MANUAL_CATALOG.resolve(id) ?? id;
  const [pinned, setPinned] = useState(false),
    [dismissed, setDismissed] = useState(false),
    instanceId = useId();
  const rootConcept = CONCEPTS[id],
    rootNode = FIELD_MANUAL_CATALOG.byId.get(manualId),
    control = controlOverride ?? rootNode?.control ?? rootConcept?.control,
    visibleDetails = details.slice(0, 4);

  useEffect(() => {
    setPinned(false);
    setDismissed(false);
  }, [id]);

  useEffect(() => {
    const closeOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) {
        setPinned(false);
        setDismissed(false);
      }
    };
    window.addEventListener("bubblette-pinned", closeOther);
    return () => window.removeEventListener("bubblette-pinned", closeOther);
  }, [instanceId]);
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
    setDismissed(false);
  };
  const runControl = () => runDestination(control);
  const toggle = () => {
    setDismissed(false);
    setPinned((value) => {
      const next = !value;
      if (next)
        window.dispatchEvent(
          new CustomEvent("bubblette-pinned", { detail: instanceId }),
        );
      return next;
    });
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
            <small>{pinned ? "FIELD APPLETTE // PINNED" : "FIELD GLANCE"}</small>
            <b>{title}</b>
          </div>
          <button aria-label="Unpin bubblette" onClick={close}>
            ×
          </button>
        </header>
        <p>{summary}</p>
        <small className="bubblette-pin-hint">CLICK TO PIN</small>
        {visibleDetails.length ? (
          <dl>
            {visibleDetails.map((detail) => {
              const detailId = detail.conceptId
                  ? FIELD_MANUAL_CATALOG.resolve(detail.conceptId)
                  : undefined,
                detailControl = detail.control;
              return (
                <div
                  className={detail.tone ?? "neutral"}
                  key={`${detail.label}-${detail.value}`}
                >
                  <dt>
                    {detail.conceptId ? (
                      <button
                        onClick={() =>
                          openWikiApplet(detailId ?? detail.conceptId ?? id)
                        }
                      >
                        {detail.label} ↗
                      </button>
                    ) : (
                      <span>{detail.label}</span>
                    )}
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
          <button onClick={() => openWikiApplet(manualId)}>
            FIELD MANUAL // {title.toUpperCase()} ↗
          </button>
        </div>
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
