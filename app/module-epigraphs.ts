export const MODULE_EPIGRAPHS = {
  campaign: {
    quote: "The map is where every other ledger comes to collect.",
    source: "COMM. HET CLAXTON // PRAETOR CORPS",
  },
  production: {
    quote: "Production is the rate at which destruction stops being final.",
    source: "MARA VANN // WAR PRODUCTION BUREAU",
  },
  military: {
    quote:
      "A formation exists only while people, equipment, and orders arrive together.",
    source: "OFFICE OF REPLACEMENT ADMINISTRATION // CIRCULAR 17",
  },
  diplomacy: {
    quote: "Between states, every necessity becomes leverage.",
    source: "FOREIGN OBLIGATIONS OFFICE // BELLIGERENT RELATIONS",
  },
  doctrine: {
    quote:
      "A doctrine is born when a battlefield mistake becomes too useful to condemn.",
    source: "DOCTRINE ARCHIVE // CANON CORPUS",
  },
} as const;

export type ModuleEpigraphKey = keyof typeof MODULE_EPIGRAPHS;
