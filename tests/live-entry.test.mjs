import assert from "node:assert/strict";
import test from "node:test";

const base = new URL(
  process.env.DELENDA_LIVE_BASE_URL ?? "https://delenda.quest",
);
const customDomain = base.hostname === "delenda.quest";
const forbiddenStats =
  /State of the war|modern-state-surface|state-constellation|state-throughput-grid|state-report-block/i;
const cacheBust = () => `${Date.now()}-${crypto.randomUUID()}`;

const sessionCookie = fetch(
  new URL("/api/session?return_to=%2Fgame", base),
  { cache: "no-store", redirect: "manual" },
).then((response) => {
  assert.equal(response.status, 307);
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "session bootstrap did not set a cookie");
  return setCookie.split(";", 1)[0];
});

const fetchNoStore = async (url) =>
  fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      accept: "text/html,*/*",
      "cache-control": "no-cache, no-store, must-revalidate",
      cookie: await sessionCookie,
      pragma: "no-cache",
      "user-agent": "DELENDA-live-acceptance/2.0",
    },
  });

for (const pathname of ["/", "/game", "/game/"]) {
  test(`live ${pathname} renders Daily Campaign and cannot render Stats`, async () => {
    const url = new URL(pathname, base);
    url.searchParams.set("acceptance", cacheBust());
    const response = await fetchNoStore(url);
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
      forbiddenStats,
      "the deleted Stats surface is still present",
    );
    assert.doesNotMatch(
      html,
      /landing-page|LandingRedirect|ENTER CAMPAIGN/i,
      "the deleted landing page still owns a production entry route",
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

test("live production assets expose 00 Dashboard and contain no Stats implementation", async () => {
  const gameUrl = new URL("/game", base);
  gameUrl.searchParams.set("acceptance", cacheBust());
  const gameResponse = await fetchNoStore(gameUrl);
  const html = await gameResponse.text();
  assert.equal(gameResponse.status, 200);

  const assetPaths = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  assert.ok(assetPaths.length > 0, "production HTML did not expose build assets");

  const assets = await Promise.all(
    assetPaths.map(async (assetPath) => {
      const assetUrl = new URL(assetPath, gameResponse.url);
      assetUrl.searchParams.set("acceptance", cacheBust());
      const response = await fetchNoStore(assetUrl);
      assert.equal(response.status, 200, `${assetUrl} returned ${response.status}`);
      return response.text();
    }),
  );
  const artifact = `${html}\n${assets.join("\n")}`;

  assert.doesNotMatch(
    artifact,
    forbiddenStats,
    "the deleted Stats renderer or stylesheet remains in production assets",
  );
  assert.match(
    artifact,
    /data-command-storyboard/,
    "the recovered command storyboard is absent from production assets",
  );
  assert.match(
    artifact,
    /Morning report \/\/ Day/i,
    "the recovered storyboard's Daily Brief is absent",
  );
  assert.match(
    artifact,
    /storyboard.{0,100}Dashboard.{0,100}00|00.{0,100}Dashboard.{0,100}storyboard/i,
    "00 Dashboard is not exposed in Command Windows navigation",
  );
});
