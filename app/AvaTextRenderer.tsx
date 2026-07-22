"use client";

import { terminalBlocks, type AvaTextBlockKind } from "./ava/text-schema";

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

function AvaLine({ line }: { line: string }) {
  const tagged = line.match(evidence);
  if (tagged)
    return (
      <p className={`ava-line ${lineTone(line)}`}>
        <span className="ava-evidence">{tagged[1]}</span>
        {" "}
        {tagged[2]}
      </p>
    );
  const binding = line.match(/^([A-Z][A-Z0-9 '\-()/]{1,46}):\s+(.+)$/);
  if (binding)
    return (
      <p className={`ava-line ${lineTone(line)}`}>
        <strong>{binding[1]}</strong>
        <span aria-hidden="true">: </span>
        {binding[2]}
      </p>
    );
  return <p className={`ava-line ${lineTone(line)}`}>{line}</p>;
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
