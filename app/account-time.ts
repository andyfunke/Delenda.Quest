const partsFor = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

export const validTimeZone = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const browserTimeZone = () => {
  try {
    const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return validTimeZone(value) ? value : "UTC";
  } catch {
    return "UTC";
  }
};

export const accountDayKey = (
  date: Date = new Date(),
  timeZone?: string,
) => {
  if (timeZone && validTimeZone(timeZone)) return partsFor(date, timeZone);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const boundaryAfter = (date: Date, timeZone: string) => {
  const current = accountDayKey(date, timeZone);
  let low = date.getTime() + 1;
  let high = date.getTime() + 36 * 60 * 60 * 1000;
  while (accountDayKey(new Date(high), timeZone) === current)
    high += 12 * 60 * 60 * 1000;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (accountDayKey(new Date(middle), timeZone) === current)
      low = middle + 1;
    else high = middle;
  }
  return low;
};

const boundaryBefore = (date: Date, timeZone: string) => {
  const current = accountDayKey(date, timeZone);
  let low = date.getTime() - 36 * 60 * 60 * 1000;
  let high = date.getTime();
  while (accountDayKey(new Date(low), timeZone) === current)
    low -= 12 * 60 * 60 * 1000;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (accountDayKey(new Date(middle), timeZone) === current) high = middle;
    else low = middle;
  }
  return high;
};

export const accountDayBounds = (
  timeZone: string,
  now: number = Date.now(),
) => {
  const zone = validTimeZone(timeZone) ? timeZone : "UTC";
  const date = new Date(now);
  return {
    start: boundaryBefore(date, zone),
    end: boundaryAfter(date, zone),
  };
};

export const accountClockAfterClaim = (
  claimedTimeZone: unknown,
  currentTimeZone: string,
  now: number = Date.now(),
) =>
  accountDayBounds(
    validTimeZone(claimedTimeZone)
      ? claimedTimeZone
      : validTimeZone(currentTimeZone)
        ? currentTimeZone
        : "UTC",
    now,
  );

export const millisecondsUntilNextAccountDay = (
  date: Date = new Date(),
  timeZone?: string,
) => {
  if (!timeZone) {
    const next = new Date(date);
    next.setHours(24, 0, 0, 0);
    return Math.max(1, next.getTime() - date.getTime());
  }
  const zone = validTimeZone(timeZone) ? timeZone : "UTC";
  return Math.max(1, boundaryAfter(date, zone) - date.getTime());
};
