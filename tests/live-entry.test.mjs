import assert from "node:assert/strict";
import test from "node:test";

const base = new URL(
  process.env.DELENDA_LIVE_BASE_URL ?? "https://delenda.quest",
);
const customDomain = base.hostname === "delenda.quest";

for (const pathname of ["/", "/game", "/game/"]) {
  test(`live ${pathname} renders Daily Campaign and cannot render Stats`, async () => {
    const url = new URL(pathname, base);
    url.searchParams.set("acceptance", `${Date.now()}-${Math.random()}`);
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        accept: "text/html",
        "cache-control": "no-cache, no-store, must-revalidate",
        pragma: "no-cache",
        "user-agent": "DELENDA-live-acceptance/1.0",
      },
    });
    const html = await response.text();

    assert.equal(response.status, 200, `${url} returned ${response.status}`);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^text\/html\b/i,
    );
    if (customDomain)
      assert.equal(
        new URL(response.url).hostname,
        "delenda.quest",
        `${pathname} escaped the production custom domain`,
      );

    assert.doesNotMatch(
      html,
      /State of the war|modern-state-surface|state-constellation|state-report-block/i,
      "the deleted Stats surface is still present",
    );
    assert.match(
      html,
      /data-game-entry-contract="daily-campaign"/,
      "the production build marker is missing",
    );
    assert.match(
      html,
      /<button(?=[^>]*\bclass="active")(?=[^>]*\baria-pressed="true")[^>]*>\s*DAILY CAMPAIGN\s*<\/button>/i,
      "Daily Campaign is not the active default",
    );
  });
}
