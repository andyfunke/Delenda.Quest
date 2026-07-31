export const hashInt = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const stableHash = (text: string) => hashInt(text) / 4294967295;

export const candidateSetHash = (ids: string[]) =>
  hashInt([...ids].sort().join("|")).toString(16).padStart(8, "0");

export const selectionTicketFor = (parts: string[]) =>
  `docket-${hashInt(parts.join(":")).toString(16).padStart(8, "0")}`;
