import assert from "node:assert/strict";
import test from "node:test";

const email = await import(process.env.DELENDA_EMAIL_NEXUS_BUNDLE);

test("Email Nexus normalizes a complete sign-in request", () => {
  const decision = email.validateEmailNexusRequest({
    version: "1",
    operation: "REQUEST_SIGN_IN",
    email: " Commander@Example.COM ",
    redirectPath: "/game",
    idempotencyKey: "auth:request:0001",
  });
  assert.equal(decision.ok, true);
  assert.equal(decision.request.email, "commander@example.com");
  assert.equal(decision.authority, "EMAIL_NEXUS");
});

test("Email Nexus rejects open redirects, weak tokens, and incomplete email commands", () => {
  assert.equal(email.validateEmailNexusRequest({
    version: "1",
    operation: "REDEEM_SIGN_IN",
    token: "too-short",
    redirectPath: "https://attacker.invalid",
    idempotencyKey: "auth:redeem:0001",
  }).ok, false);
  assert.deepEqual(email.validateEmailNexusRequest({
    version: "1",
    operation: "INGEST_PLAYER_COMMAND",
    email: "commander@example.com",
    accountId: "account-1",
    campaignId: "#WAR-TEST-1",
    command: "compare M1 M2",
    idempotencyKey: "mail:command:0001",
  }), {
    ok: false,
    code: "EMAIL_FIELDS_REQUIRED",
    instruction: "Missing: messageId.",
  });
});
