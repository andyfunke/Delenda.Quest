import assert from "node:assert/strict";
import test from "node:test";

const persistence = await import(process.env.DELENDA_CAMPAIGN_PERSISTENCE_BUNDLE);

const envelope = (overrides = {}) => ({
  accountKey: "commander@example.com",
  state: { campaignId: "campaign-a", day: 3, actions: 2 },
  clock: { start: 100, end: 200 },
  runToken: "run-a",
  multiplayerRun: false,
  savedAt: 1_000,
  updatedAt: 900,
  revision: 5,
  ...overrides,
});

test("a stale device snapshot cannot inherit a newer remote revision", () => {
  const remote = envelope({ revision: 6, updatedAt: 900 });
  const local = envelope({
    revision: 5,
    savedAt: 2_000,
    state: { campaignId: "campaign-a", day: 2, actions: 0 },
  });
  const selected = persistence.selectCampaignForHydration({
    remote,
    local,
    accountKey: "commander@example.com",
    migrated: true,
    remoteAvailable: true,
  });
  assert.equal(selected.source, "remote");
  assert.equal(selected.record, remote);
  assert.equal(selected.expectedRevision, 6);
  assert.equal(selected.discardedDeviceBranch, true);
});

test("a newer device snapshot may lead only its acknowledged remote base", () => {
  const remote = envelope({ savedAt: 500, updatedAt: 900 });
  const local = envelope({
    savedAt: 1_500,
    state: { campaignId: "campaign-a", day: 3, actions: 1 },
  });
  const selected = persistence.selectCampaignForHydration({
    remote,
    local,
    accountKey: "commander@example.com",
    migrated: true,
    remoteAvailable: true,
  });
  assert.equal(selected.source, "device");
  assert.equal(selected.record, local);
  assert.equal(selected.expectedRevision, 5);
  assert.equal(selected.discardedDeviceBranch, false);
});

test("a deleted remote campaign is not resurrected from an acknowledged device copy", () => {
  const selected = persistence.selectCampaignForHydration({
    remote: null,
    local: envelope({ revision: 4 }),
    accountKey: "commander@example.com",
    migrated: true,
    remoteAvailable: true,
  });
  assert.equal(selected.source, "none");
  assert.equal(selected.record, null);
  assert.equal(selected.remoteDeleted, true);
  assert.equal(selected.discardedDeviceBranch, true);
});

test("an actually unsaved campaign can perform a create-only save", () => {
  const local = envelope({ revision: 0 });
  const selected = persistence.selectCampaignForHydration({
    remote: null,
    local,
    accountKey: "commander@example.com",
    migrated: true,
    remoteAvailable: true,
  });
  assert.equal(selected.source, "device");
  assert.equal(selected.record, local);
  assert.equal(selected.expectedRevision, 0);
  assert.equal(selected.remoteDeleted, false);
});

test("offline recovery preserves the device branch's own revision", () => {
  const local = envelope({ revision: 7 });
  const selected = persistence.selectCampaignForHydration({
    remote: null,
    local,
    accountKey: "commander@example.com",
    migrated: true,
    remoteAvailable: false,
  });
  assert.equal(selected.source, "device");
  assert.equal(selected.expectedRevision, 7);
});

test("save acknowledgments prove the exact branch and next revision", () => {
  const submitted = envelope({ expectedRevision: 5 });
  assert.equal(
    persistence.campaignSaveWasAccepted(
      submitted,
      envelope({ revision: 6 }),
    ),
    true,
  );
  assert.equal(
    persistence.campaignSaveWasAccepted(
      submitted,
      envelope({
        revision: 6,
        state: { campaignId: "campaign-a", day: 3, actions: 1 },
      }),
    ),
    false,
  );
  assert.equal(
    persistence.campaignSaveWasAccepted(
      submitted,
      envelope({ revision: 7 }),
    ),
    false,
  );
});

