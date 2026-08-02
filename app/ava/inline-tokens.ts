export type AvaActionHandleFamily = "M" | "D" | "N" | "P" | "X" | "T" | "Z";

export type AvaInlineToken =
  | { kind: "text"; value: string }
  | {
      kind: "action-handle";
      value: string;
      handle: string;
      family: AvaActionHandleFamily;
    }
  | {
      kind: "rating";
      value: string;
      band: "HIGH" | "MEDIUM" | "LOW";
      score: number;
    };

const inlineToken =
  /\[(?:M|D|N|P|X|T|Z)\d+\]|\b(?:M|D|N|P|X|T|Z)\d+\b|\b(?:HIGH|MEDIUM|LOW)\s+\d{1,3}\/100\b/g;
const handleToken = /^\[?([MDNPXTZ])(\d+)\]?$/;
const ratingToken = /^(HIGH|MEDIUM|LOW)\s+(\d{1,3})\/100$/;

/**
 * Classifies the finite inline vocabulary already present in Ava's semantic
 * text. It changes browser presentation only; terminal and export surfaces
 * retain the original byte-for-byte plain text.
 */
export const tokenizeAvaInline = (value: string): AvaInlineToken[] => {
  const tokens: AvaInlineToken[] = [];
  let cursor = 0;
  for (const match of value.matchAll(inlineToken)) {
    const index = match.index ?? 0;
    if (index > cursor)
      tokens.push({ kind: "text", value: value.slice(cursor, index) });
    const matched = match[0];
    const handle = matched.match(handleToken);
    const rating = matched.match(ratingToken);
    if (handle) {
      tokens.push({
        kind: "action-handle",
        value: matched,
        handle: `${handle[1]}${handle[2]}`,
        family: handle[1] as AvaActionHandleFamily,
      });
    } else if (rating) {
      tokens.push({
        kind: "rating",
        value: matched,
        band: rating[1] as "HIGH" | "MEDIUM" | "LOW",
        score: Number(rating[2]),
      });
    }
    cursor = index + matched.length;
  }
  if (cursor < value.length)
    tokens.push({ kind: "text", value: value.slice(cursor) });
  return tokens.length ? tokens : [{ kind: "text", value }];
};
