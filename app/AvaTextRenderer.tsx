"use client";

import { terminalBlocks, type AvaTextBlockKind } from "./ava/text-schema";
import { tokenizeAvaInline } from "./ava/inline-tokens";

const evidence = /^\[([^\]]+)\]\s*(.*)$/;
const explicitLoss =
  /^(?:\[(?:LOSS|WARNING|LOCKED|REJECTED)\]\s*|(?:REJECTION|ORDER REJECTED|CONFIRM REJECTED|RESOLUTION REJECTED|STAGE REJECTED|COMPARE REJECTED|WARNING|COLLAPSE|DEFEAT|LOSS):)|·\s*LOCKED:/i;
const explicitGain =
  /^(?:\[(?:GAIN|SUCCESS|EXECUTED)\]\s*|(?:ORDER ENTERED|RECEIPT|VICTORY|GAIN):)|·\s*AVAILABLE\s*$/i;

const lineTone = (line: string) =>
  explicitLoss.test(line)
    ? "loss"
    : explicitGain.test(line)
      ? "gain"
      : "neutral";

const displayTitle = (title?: string) =>
  title?.replace(/^FIELD NOTE\s*\/{1,2}\s*/i, "FIELD NOTE / ");

function AvaInline({ text }: { text: string }) {
  return tokenizeAvaInline(text).map((token, index) => {
    if (token.kind === "category")
      return (
        <span
          className={`ava-category-token ava-category-${token.category}`}
          data-ava-category={token.category}
          aria-label={`category: ${token.category}`}
          key={`${token.category}-${index}`}
        >
          <i aria-hidden="true">[{token.category[0].toUpperCase()}]</i>{token.value}
        </span>
      );
    if (token.kind === "action-handle")
      return (
        <span
          className={`ava-action-handle handle-${token.family.toLowerCase()}`}
          data-ava-action-handle={token.handle}
          key={`${token.handle}-${index}`}
        >
          {token.value}
        </span>
      );
    if (token.kind === "rating")
      return (
        <span
          className={`ava-public-rating rating-${token.band.toLowerCase()}`}
          data-ava-public-rating={token.score}
          key={`${token.band}-${token.score}-${index}`}
        >
          {token.value}
        </span>
      );
    return token.value;
  });
}

function AvaLine({ line }: { line: string }) {
  const tagged = line.match(evidence);
  if (tagged)
    return (
      <p className={`ava-line ${lineTone(line)}`}>
        {/^[MDNPXTZ]\d+$/.test(tagged[1]) ? (
          <AvaInline text={tagged[1]} />
        ) : (
          <span className="ava-evidence">{tagged[1]}</span>
        )}
        {" "}
        <AvaInline text={tagged[2]} />
      </p>
    );
  const binding = line.match(/^([A-Z][A-Z0-9 '\-()/]{1,46}):\s+(.+)$/);
  if (binding)
    return (
      <p className={`ava-line ${lineTone(line)}`}>
        <strong>{binding[1]}</strong>
        <span aria-hidden="true">: </span>
        <AvaInline text={binding[2]} />
      </p>
    );
  return (
    <p className={`ava-line ${lineTone(line)}`}>
      <AvaInline text={line} />
    </p>
  );
}

export function AvaTextRenderer({ text }: { text: string }) {
  const blocks = terminalBlocks(text);
  return (
    <div className="ava-prose">
      {blocks.map((block, index) => {
        const title = displayTitle(block.title);
        return (
          <section
            className={`ava-text-block ${block.kind as AvaTextBlockKind}`}
            key={`${title ?? block.kind}-${index}`}
          >
            {title ? <h3>{title}</h3> : null}
            {block.lines.map((line, lineIndex) => (
              <AvaLine line={line} key={`${line}-${lineIndex}`} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
