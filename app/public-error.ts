const INTERNAL_ERROR_MARKERS = [
  /\bD1(?:_ERROR)?\b/i,
  /\bSQLITE_(?:ERROR|CONSTRAINT|BUSY|MISMATCH)\b/i,
  /\bfailed query\b/i,
  /\bparams?:\s*\[/i,
  /\bdrizzle\b/i,
];

const MAX_PUBLIC_ERROR_LENGTH = 280;

export const publicErrorMessage = (
  value: unknown,
  fallback: string,
): string => {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (
    !normalized ||
    normalized.length > MAX_PUBLIC_ERROR_LENGTH ||
    INTERNAL_ERROR_MARKERS.some((marker) => marker.test(normalized))
  )
    return fallback;
  return normalized;
};
