import assert from "node:assert/strict";
import test from "node:test";

const time = await import(process.env.DELENDA_ACCOUNT_TIME_BUNDLE);

test("account-day boundaries honor spring and autumn daylight-saving changes", () => {
  const spring = time.accountDayBounds(
    "America/Los_Angeles",
    Date.parse("2026-03-08T12:00:00Z"),
  );
  assert.equal(spring.start, Date.parse("2026-03-08T08:00:00Z"));
  assert.equal(spring.end, Date.parse("2026-03-09T07:00:00Z"));
  assert.equal(spring.end - spring.start, 23 * 60 * 60 * 1000);

  const autumn = time.accountDayBounds(
    "America/Los_Angeles",
    Date.parse("2026-11-01T12:00:00Z"),
  );
  assert.equal(autumn.start, Date.parse("2026-11-01T07:00:00Z"));
  assert.equal(autumn.end, Date.parse("2026-11-02T08:00:00Z"));
  assert.equal(autumn.end - autumn.start, 25 * 60 * 60 * 1000);
});

test("a newly activated account timezone wins over the open client's stale timezone", () => {
  const now = Date.parse("2026-07-25T18:00:00Z");
  const claimed = time.accountClockAfterClaim(
    "Asia/Tokyo",
    "America/Los_Angeles",
    now,
  );
  assert.deepEqual(claimed, time.accountDayBounds("Asia/Tokyo", now));
  assert.notDeepEqual(
    claimed,
    time.accountDayBounds("America/Los_Angeles", now),
  );
});

test("invalid claimed timezones fail closed to the valid account timezone", () => {
  const now = Date.parse("2026-07-25T18:00:00Z");
  assert.deepEqual(
    time.accountClockAfterClaim("Not/A_Zone", "Europe/London", now),
    time.accountDayBounds("Europe/London", now),
  );
  assert.deepEqual(
    time.accountClockAfterClaim(null, "Also/Invalid", now),
    time.accountDayBounds("UTC", now),
  );
});

test("a westward timezone change opens the next turn at the old period boundary", () => {
  const oldZone = "Asia/Tokyo";
  const newZone = "America/Los_Angeles";
  const requestedAt = Date.parse("2026-07-26T06:00:00Z");
  const nextTurnAt = time.accountDayBounds(oldZone, requestedAt).end;
  const lastResolvedDayKey = time.accountDayKey(
    new Date(requestedAt),
    oldZone,
  );

  assert.equal(
    time.accountDayKey(new Date(nextTurnAt), newZone),
    lastResolvedDayKey,
    "this fixture must reproduce the local-date collision",
  );

  const before = time.accountTurnWindow({
    timeZone: newZone,
    lastResolvedDayKey,
    nextTurnAt,
    now: nextTurnAt - 1,
  });
  assert.equal(before.canResolve, false);

  const atBoundary = time.accountTurnWindow({
    timeZone: newZone,
    lastResolvedDayKey,
    nextTurnAt,
    now: nextTurnAt,
  });
  assert.equal(atBoundary.canResolve, true);
  assert.equal(atBoundary.dayKey, lastResolvedDayKey);

  const afterClaim = time.accountTurnWindow({
    timeZone: newZone,
    lastResolvedDayKey: atBoundary.dayKey,
    nextTurnAt: time.accountDayBounds(newZone, nextTurnAt).end,
    now: nextTurnAt,
  });
  assert.equal(afterClaim.canResolve, false);
});

test("an absolute next-turn gate also prevents forward timezone travel from granting an early turn", () => {
  const oldZone = "America/Los_Angeles";
  const newZone = "Asia/Tokyo";
  const requestedAt = Date.parse("2026-07-26T18:00:00Z");
  const nextTurnAt = time.accountDayBounds(oldZone, requestedAt).end;
  const lastResolvedDayKey = time.accountDayKey(
    new Date(requestedAt),
    oldZone,
  );

  assert.notEqual(
    time.accountDayKey(new Date(requestedAt), newZone),
    lastResolvedDayKey,
    "the forward zone must already appear to be on another local date",
  );
  assert.equal(
    time.accountTurnWindow({
      timeZone: newZone,
      lastResolvedDayKey,
      nextTurnAt,
      now: requestedAt,
    }).canResolve,
    false,
  );
  assert.equal(
    time.accountTurnWindow({
      timeZone: newZone,
      lastResolvedDayKey,
      nextTurnAt,
      now: nextTurnAt,
    }).canResolve,
    true,
  );
});

test("legacy turn rows are lazily gated before an immediate timezone change", () => {
  const oldZone = "UTC";
  const now = Date.parse("2026-07-26T18:00:00Z");
  const oldDayKey = time.accountDayKey(new Date(now), oldZone);

  assert.equal(
    time.legacyTurnGateBeforeTimeZoneChange({
      timeZone: oldZone,
      lastResolvedDayKey: oldDayKey,
      nextTurnAt: null,
      now,
    }),
    time.accountDayBounds(oldZone, now).end,
    "a resolved legacy day must retain the old zone's closing boundary",
  );
  assert.equal(
    time.legacyTurnGateBeforeTimeZoneChange({
      timeZone: oldZone,
      lastResolvedDayKey: "2026-07-25",
      nextTurnAt: null,
      now,
    }),
    now,
    "an already eligible legacy account must remain immediately eligible",
  );
  assert.equal(
    time.legacyTurnGateBeforeTimeZoneChange({
      timeZone: oldZone,
      lastResolvedDayKey: null,
      nextTurnAt: null,
      now,
    }),
    null,
    "a never-played account must not be locked before its first turn",
  );
  assert.equal(
    time.legacyTurnGateBeforeTimeZoneChange({
      timeZone: oldZone,
      lastResolvedDayKey: oldDayKey,
      nextTurnAt: now + 1234,
      now,
    }),
    null,
    "an absolute gate must never be overwritten",
  );
});

test("a due pre-migration timezone change materializes its exact queued boundary", () => {
  const effectiveAt = Date.parse("2026-07-26T15:00:00Z");
  assert.equal(
    time.legacyTurnGateForPendingTimeZone({
      lastResolvedDayKey: "2026-07-27",
      nextTurnAt: null,
      effectiveAt,
    }),
    effectiveAt,
  );
  assert.equal(
    time.legacyTurnGateForPendingTimeZone({
      lastResolvedDayKey: null,
      nextTurnAt: null,
      effectiveAt,
    }),
    null,
  );
  assert.equal(
    time.legacyTurnGateForPendingTimeZone({
      lastResolvedDayKey: "2026-07-27",
      nextTurnAt: effectiveAt + 1,
      effectiveAt,
    }),
    null,
  );
});
