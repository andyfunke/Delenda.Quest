/**
 * Adapter preserving Epoch 007/008 `ava:content-quality` enumeration.
 * Multi-medium Contentgen enumeration lives in enumerate.mjs; this module
 * re-exports the legacy Ava enumerator so the old CLI remains authoritative
 * for Ava-only quality reports.
 */
export {
  enumerate as enumerateAvaLegacy,
  buildReport,
  decompile,
  hardGate,
} from "../../../scripts/ava-content-quality.mjs";
