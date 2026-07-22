"use client";

import { terminalBlocks, type AvaTextBlockKind } from "./ava/text-schema";

const evidence = /^\[([^\]]+)\]\s*(.*)$/;
const lineTone = (line: string) =>
  /REJECTED|LOCKED|WARNING|COLLAPSE|LOSS|−/.test(line)
    ? "loss"
    : /EXECUTED|AVAILABLE|RETAINED|GRADUATE|\+/.test(line)
      ? "gain"
      : "neutral";

function AvaLine({ line }: { line: string }) {
  const tagged = line.match(evidence);
  if (tagged)
    return (
      <p className={`ava-line ${lineTone(line)}`}>
        <span className="ava-evidence">{tagged[1]}</span>
        {tagged[2]}
      </p>
    );
  const divider = line.indexOf(" // ");
  if (divider > 0 && divider < 48)
    return (
      <p className={`ava-line ${lineTone(line)}`}>
        <strong>{line.slice(0, divider)}</strong>
        <span aria-hidden="true"> // </span>
        {line.slice(divider + 4)}
      </p>
    );
  return <p className={`ava-line ${lineTone(line)}`}>{line}</p>;
}

export function AvaTextRenderer({ text }: { text: string }) {
  const blocks = terminalBlocks(text);
  return (
    <div className="ava-prose">
      {blocks.map((block, index) => (
        <section
          className={`ava-text-block ${block.kind as AvaTextBlockKind}`}
          key={`${block.title ?? block.kind}-${index}`}
        >
          {block.title ? <h3>{block.title}</h3> : null}
          {block.lines.map((line, lineIndex) => (
            <AvaLine line={line} key={`${line}-${lineIndex}`} />
          ))}
        </section>
      ))}
    </div>
  );
}
