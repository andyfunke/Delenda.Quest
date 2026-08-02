import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

const flatCanonicalDigest = (value) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(value).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
      ),
    )
    .digest("hex");

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
  for (const attribute of [
    "data-ava-cognitive-runtime",
    "data-ava-cognitive-status",
    "data-ava-cognitive-families",
  ])
    assert.match(
      artifact,
      new RegExp(attribute),
      `${attribute} is absent from the deployed client artifact`,
    );
});

test("live OG Ava attests every active engine on real web and terminal-core paths", async () => {
  const unauthorizedUrl = new URL("/api/ava/activation", base);
  unauthorizedUrl.searchParams.set("acceptance", cacheBust());
  const unauthorized = await fetch(unauthorizedUrl, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  assert.equal(
    unauthorized.status,
    401,
    "the activation probe must require a session",
  );

  const expectedActivation = {
    decision: { authority: "READ_ONLY", families: ["DECISION", "REALIZATION"], signal: "COMPILED_ROBUST_DECISION", textDigest: "21f5704a48e3f0dcaaba759ab5c448f5ffefdf4e6a78d77a64afd7200fe5f7d0" },
    directive: { authority: "READ_ONLY", families: ["DECISION", "REALIZATION"], signal: "COMPILED_DIRECTIVE_DECISION", textDigest: "8b84b49b6d0aff37f36835c8307c6d3a18c965bdc92a7209477cff95c7e99b19" },
    forecast: { authority: "READ_ONLY", families: ["REALIZATION", "TEMPORAL"], signal: "COMPILED_TEMPORAL_PROJECTION", textDigest: "b529d66bba623bbc5d7e0249661bb17d98cfd035b29052809dd9e523d71f0cbf" },
    constraint: { authority: "READ_ONLY", families: ["CONSTRAINT", "REALIZATION"], signal: "COMPILED_PRECONDITION_RESULT", textDigest: "60b13ace278e96aac9946f8b74a28fef466c6f8579d7683392b3574535e7aa37" },
    planning: { authority: "PLAN_ONLY", families: ["PLANNING", "REALIZATION"], signal: "PLAN_ONLY_CONFIRMATION_READY", textDigest: "061b0ba228856554ecf32ed0a0f00d0138cf4ff90c5927c4377a165ae3921d82" },
    causal: { authority: "READ_ONLY", families: ["CAUSAL", "REALIZATION"], signal: "OBSERVATIONAL_CAUSAL_DIAGNOSIS", textDigest: "3e07acfeb8c657cc252a8b49449d994237b408cb60aab3fd9b18eca7f2ec6aac" },
    epistemic: { authority: "READ_ONLY", families: ["EPISTEMIC", "REALIZATION"], signal: "SINGLE_RECORD_EVIDENCE_BOUND", textDigest: "ccd2ba2ee4fc1c3a4680d3a138307c3b3d6be273070d4b6e5a4cb109a31896c6" },
  };
  const adapters = ["web", "ssh"];
  const cases = Object.keys(expectedActivation).flatMap((probe) =>
    adapters.map((adapter) => ({ adapter, probe })),
  );
  const payloads = await Promise.all(
    cases.map(async ({ adapter, probe }) => {
      const url = new URL("/api/ava/activation", base);
      url.searchParams.set("adapter", adapter);
      url.searchParams.set("probe", probe);
      url.searchParams.set("acceptance", cacheBust());
      const response = await fetchNoStore(url);
      assert.equal(
        response.status,
        200,
        `${adapter}/${probe} activation returned ${response.status}`,
      );
      assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
      return response.json();
    }),
  );

  for (const [index, payload] of payloads.entries()) {
    assert.deepEqual(Object.keys(payload).sort(), [
      "activation",
      "contract",
      "proofIdentity",
      "resultMarker",
    ]);
    assert.deepEqual(Object.keys(payload.contract).sort(), [
      "adapter",
      "buildMarker",
      "id",
      "probe",
      "version",
    ]);
    assert.equal(payload.contract.id, "delenda-ava-cognitive-activation");
    assert.equal(payload.contract.version, "5");
    assert.equal(
      payload.contract.buildMarker,
      "ava-cognitive-nexus-attestation-2026-07-31.4",
      "production is serving a stale activation contract",
    );
    assert.equal(
      payload.contract.adapter,
      cases[index].adapter === "web" ? "web-core" : "terminal-core",
    );
    assert.equal(payload.contract.probe, cases[index].probe);
    assert.deepEqual(Object.keys(payload.activation).sort(), [
      "authority",
      "digest",
      "domainDigest",
      "domainId",
      "domainVersion",
      "operatorFamilies",
      "runtime",
      "status",
      "version",
    ]);
    assert.equal(payload.activation.version, "1");
    assert.equal(payload.activation.runtime, "AVA_COGNITIVE_NEXUS");
    assert.equal(payload.activation.status, "COMPLETED");
    assert.equal(
      payload.activation.authority,
      expectedActivation[cases[index].probe].authority,
    );
    assert.deepEqual(
      payload.activation.operatorFamilies,
      expectedActivation[cases[index].probe].families,
    );
    assert.equal(payload.activation.domainId, "delenda-cognitive-domain");
    assert.equal(payload.activation.domainVersion, "1.2.0");
    assert.match(payload.activation.domainDigest, /^[a-f0-9]{64}$/);
    assert.match(payload.activation.digest, /^[a-f0-9]{64}$/);
    assert.match(payload.proofIdentity, /^[a-f0-9]{64}$/);
    assert.deepEqual(Object.keys(payload.resultMarker).sort(), [
      "activationDigest",
      "digest",
      "probe",
      "proofDigest",
      "signal",
      "textDigest",
      "version",
    ]);
    assert.equal(payload.resultMarker.version, "1");
    assert.equal(payload.resultMarker.probe, cases[index].probe);
    assert.equal(
      payload.resultMarker.signal,
      expectedActivation[cases[index].probe].signal,
    );
    assert.equal(
      payload.resultMarker.activationDigest,
      payload.activation.digest,
    );
    assert.equal(payload.resultMarker.proofDigest, payload.proofIdentity);
    assert.equal(
      payload.resultMarker.textDigest,
      expectedActivation[cases[index].probe].textDigest,
    );
    const { digest: markerDigest, ...markerBody } = payload.resultMarker;
    assert.equal(markerDigest, flatCanonicalDigest(markerBody));
    assert.doesNotMatch(
      JSON.stringify(payload.resultMarker),
      /campaignId|playerId|worldRevision|executionDigest|proofGraph|sourceIds|rawInput|fact:/i,
    );
  }
  for (const probe of Object.keys(expectedActivation)) {
    const paired = payloads.filter(
      (payload) => payload.contract.probe === probe,
    );
    assert.equal(paired.length, 2);
    assert.equal(
      new Set(paired.map((payload) => payload.activation.digest)).size,
      1,
      `${probe} changed activation identity across web and terminal`,
    );
    assert.equal(
      new Set(paired.map((payload) => payload.proofIdentity)).size,
      1,
      `${probe} changed proof identity across web and terminal`,
    );
    assert.equal(
      new Set(paired.map((payload) => payload.resultMarker.digest)).size,
      1,
      `${probe} changed result identity across web and terminal`,
    );
    assert.equal(
      new Set(paired.map((payload) => payload.resultMarker.textDigest)).size,
      1,
      `${probe} changed rendered engine result across web and terminal`,
    );
  }
});
