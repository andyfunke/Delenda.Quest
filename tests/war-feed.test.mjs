import assert from "node:assert/strict";
import test from "node:test";

const mod = await import(process.env.DELENDA_WAR_FEED_BUNDLE);

test("the theater wire contains 100 unique authored artifacts over exactly 24 hours", () => {
  assert.equal(mod.WAR_FEED_ARTIFACTS.length, 100);
  assert.equal(new Set(mod.WAR_FEED_ARTIFACTS).size, 100);
  assert.ok(mod.WAR_FEED_ARTIFACTS.every((artifact) => artifact.endsWith(".")));
  assert.ok(mod.WAR_FEED_ARTIFACTS.every((artifact) => artifact.length >= 70));
  assert.ok(
    mod.WAR_FEED_ARTIFACTS.includes(
      "ENEMY FORCES ENGAGED AT WON TON RIDGE; ARMOR, PERSONNEL, AND OPERATOR-SPECIALIST COLUMN DISINTERMEDIATED.",
    ),
  );
  const invokedAt = Date.UTC(2026, 6, 24, 13, 17, 42);
  const feed = mod.warFeedForInvocation(invokedAt);
  assert.equal(feed.length, 100);
  assert.equal(feed[0].timestamp, invokedAt);
  assert.equal(feed.at(-1).timestamp, invokedAt - 86_400_000);
  assert.ok(feed.every((item, index) => index === 0 || item.timestamp < feed[index - 1].timestamp));
});
