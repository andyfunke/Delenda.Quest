import assert from "node:assert/strict";
import test from "node:test";

const mod = await import(process.env.DELENDA_AVA_CHAT_EXPORT_BUNDLE);

test("Ava chat export serializes the visible local dialogue in order", () => {
  const transcript = mod.serializeAvaChatLog({
    campaignId: "campaign-export-test",
    day: 7,
    exportedAt: new Date("2026-08-01T20:00:00.000Z"),
    entries: [
      { who: "YOU", text: "what should I do?\r\n" },
      { who: "AVA", text: "Choose M1.\nNothing was issued." },
      { who: "YOU", text: "export chat" },
    ],
  });

  assert.match(transcript, /^DELENDA\.QUEST \/\/ AVA CHAT LOG/);
  assert.match(transcript, /CAMPAIGN: campaign-export-test/);
  assert.match(transcript, /DAY: 7/);
  assert.match(transcript, /EXPORTED: 2026-08-01T20:00:00\.000Z/);
  assert.match(
    transcript,
    /001 \/\/ YOU\nwhat should I do\?\n\n002 \/\/ AVA\nChoose M1\.\nNothing was issued\.\n\n003 \/\/ YOU\nexport chat/,
  );
  assert.doesNotMatch(transcript, /\r/);
});
