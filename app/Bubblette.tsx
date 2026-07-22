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
  related?: { id: string; label?: string }[];
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
  related,
}: Props) {
  const rootCatalogId = FIELD_MANUAL_CATALOG.resolve(id) ?? id;
  const [pinned, setPinned] = useState(false),
    [dismissed, setDismissed] = useState(false),
    [activeId, setActiveId] = useState(rootCatalogId),
    instanceId = useId();
  const rootConcept = CONCEPTS[id],
    rootNode = FIELD_MANUAL_CATALOG.byId.get(rootCatalogId),
    activeNode = FIELD_MANUAL_CATALOG.byId.get(activeId),
    isRoot = activeId === rootCatalogId,
    activeTitle = isRoot ? title : (activeNode?.label ?? activeId),
    activeSummary = isRoot
      ? summary
      : (activeNode?.summary ?? "No field definition is registered."),
    activeDetails = isRoot
      ? details
      : activeNode
        ? [{ label: "DEFINITION", value: activeNode.body }]
        : [],
    control = isRoot
      ? (controlOverride ?? rootNode?.control ?? rootConcept?.control)
      : activeNode?.control,
    dependencies = isRoot
      ? (related ??
        rootNode?.related.map((relatedId) => ({
          id: relatedId,
          label: FIELD_MANUAL_CATALOG.byId.get(
            FIELD_MANUAL_CATALOG.resolve(relatedId) ?? "",
          )?.label,
        })) ?? [])
      : (activeNode?.related.map((relatedId) => ({
          id: relatedId,
          label: FIELD_MANUAL_CATALOG.byId.get(
            FIELD_MANUAL_CATALOG.resolve(relatedId) ?? "",
          )?.label,
        })) ?? []);

  useEffect(() => {
    setPinned(false);
    setDismissed(false);
    setActiveId(rootCatalogId);
  }, [id, rootCatalogId]);

  useEffect(() => {
    const closeOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) {
        setPinned(false);
        setDismissed(false);
        setActiveId(rootCatalogId);
      }
    };
    window.addEventListener("bubblette-pinned", closeOther);
    return () => window.removeEventListener("bubblette-pinned", closeOther);
  }, [instanceId, rootCatalogId]);
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
    setActiveId(rootCatalogId);
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
      else setActiveId(rootCatalogId);
      return next;
    });
  };
  const close = () => {
    setPinned(false);
    setDismissed(true);
    setActiveId(rootCatalogId);
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
        aria-label={`${activeTitle} inspection`}
      >
        <header>
          <div>
            <small>{pinned ? "FIELD APPLETTE // PINNED" : "FIELD GLANCE"}</small>
            <b>{activeTitle}</b>
          </div>
          <button aria-label="Unpin bubblette" onClick={close}>
            ×
          </button>
        </header>
        <p>{activeSummary}</p>
        {activeDetails.length ? (
          <dl>
            {activeDetails.map((detail) => {
              const detailId = detail.conceptId
                  ? FIELD_MANUAL_CATALOG.resolve(detail.conceptId)
                  : undefined,
                detailNode = detailId
                  ? FIELD_MANUAL_CATALOG.byId.get(detailId)
                  : undefined,
                detailConcept =
                  detailNode ??
                  (detail.conceptId ? CONCEPTS[detail.conceptId] : undefined),
                detailControl = detail.control ?? detailConcept?.control,
                traverses = !!detailId && detailId !== activeId;
              return (
                <div
                  className={detail.tone ?? "neutral"}
                  key={`${detail.label}-${detail.value}`}
                >
                  <dt>
                    {traverses ? (
                      <button onClick={() => setActiveId(detailId)}>
                        {detail.label} →
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
          {!isRoot ? (
            <button onClick={() => setActiveId(rootCatalogId)}>
              ← {title.toUpperCase()}
            </button>
          ) : null}
          {control ? (
            <button onClick={runControl}>
              CONTROL // {control.label.toUpperCase()} →
            </button>
          ) : null}
          <button onClick={() => openWikiApplet(activeNode?.id ?? id)}>
            FIELD MANUAL // {activeTitle.toUpperCase()} ↗
          </button>
        </div>
        {dependencies.length ? (
          <nav aria-label="Related dependencies">
            <small>CONNECTED SYSTEMS</small>
            {dependencies.map((dependency) => {
              const relatedId =
                  FIELD_MANUAL_CATALOG.resolve(dependency.id) ??
                  (dependency.label
                    ? FIELD_MANUAL_CATALOG.resolve(dependency.label)
                    : undefined),
                relatedNode = relatedId
                  ? FIELD_MANUAL_CATALOG.byId.get(relatedId)
                  : undefined,
                label =
                  dependency.label ?? relatedNode?.label ?? dependency.id;
              return relatedId && relatedId !== activeId ? (
                <button
                  key={dependency.id}
                  onClick={() => setActiveId(relatedId)}
                >
                  {label} →
                </button>
              ) : (
                <span key={dependency.id}>{label}</span>
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
