import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const INVENTORY_PATH = path.join(
  ROOT,
  "content-quality/inventory/production-inventory.v1.json",
);

export function loadInventory(pathname = INVENTORY_PATH) {
  const inventory = JSON.parse(fs.readFileSync(pathname, "utf8"));
  if (inventory.version !== "contentgen-inventory/v1") {
    throw new Error(`unexpected inventory version ${inventory.version}`);
  }
  if (!Array.isArray(inventory.productions) || inventory.productions.length === 0) {
    throw new Error("inventory productions empty");
  }
  return inventory;
}

export function codepointSort(values, keyFn = (value) => value) {
  return [...values].sort((a, b) => {
    const left = String(keyFn(a));
    const right = String(keyFn(b));
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

export function requiredProducerOwners() {
  return [
    "app/ava/relevance-engine.ts",
    "app/game.ts",
    "app/campaign-substrate.ts",
    "app/sub-mission-content.ts",
    "app/war-dispatch.ts",
  ];
}
