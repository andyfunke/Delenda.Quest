export function hashInt(text) {
  let h = 2166136261;
  const normalized = String(text).normalize("NFC");
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function stableHash(text) {
  return hashInt(text) / 4294967295;
}
