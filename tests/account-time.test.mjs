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
