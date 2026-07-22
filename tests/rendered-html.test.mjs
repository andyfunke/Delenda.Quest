import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("campaign UI keeps one deferred report and consistent order language", async () => {
  const [page,packet]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/OperationsPacket.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(page,/label="ORDERS ISSUED"/);
  assert.match(page,/ISSUE ORDER →/);
  assert.doesNotMatch(page,/ISSUE OPERATIONAL ORDER|SHOW FULL CALCULATION|SHOW PRESSURE CALCULUS/i);
  assert.match(packet,/label="ASSESSED ENEMY"/);
  assert.match(packet,/label:"FRONTAGE"/);
  assert.doesNotMatch(packet,/label="FRONTAGE"/);
  for(const id of ["terrain-conversion","ground-condition","command-network","operational-supply","intelligence"]){
    assert.match(packet,new RegExp(`id:"${id}"`));
  }
});
