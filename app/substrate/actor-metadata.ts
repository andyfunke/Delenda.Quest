export type DiplomacyActorMetadata = {
  actorId: string;
  name: string;
  role: "ally" | "neutral" | "rival" | "broker";
  allowedClades: string[];
  forbiddenClades: string[];
  preferredInstruments: string[];
  /** Family IDs this actor may expose as their daily tree candidates. */
  allowedFamilyIds: string[];
  realizationRegister: string;
  interest: string;
};

/**
 * Explicit metadata for the four active factions.
 * No unrestricted defaults — every family is assigned or marked shared elsewhere.
 */
export const DIPLOMACY_ACTOR_METADATA: DiplomacyActorMetadata[] = [
  {
    actorId: "orison",
    name: "Orison Compact",
    role: "ally",
    allowedClades: [
      "diplomacy-clade-access-and-exchange",
      "diplomacy-clade-commitments-and-alliances",
    ],
    forbiddenClades: ["diplomacy-clade-influence-and-coercion"],
    preferredInstruments: ["aid", "treaty", "burden-sharing", "industrial-license"],
    allowedFamilyIds: [
      "supply",
      "alliance-obligations",
      "burden-sharing",
      "industrial-accords",
      "treaties",
    ],
    realizationRegister: "ally-compact",
    interest: "Keep the active line consuming enemy attention without entering it",
  },
  {
    actorId: "vey",
    name: "Vey Port Authority",
    role: "neutral",
    allowedClades: [
      "diplomacy-clade-access-and-exchange",
      "diplomacy-clade-commitments-and-alliances",
    ],
    forbiddenClades: [],
    preferredInstruments: ["transit", "finance", "relief", "courtship"],
    allowedFamilyIds: [
      "neutral-courtship",
      "neutral-transit",
      "neutral-finance",
      "relief-access",
      "prisoner-exchange",
    ],
    realizationRegister: "neutral-port",
    interest: "Preserve transit revenue and legal neutrality",
  },
  {
    actorId: "kestrel",
    name: "Kestrel Exchange",
    role: "broker",
    allowedClades: [
      "diplomacy-clade-access-and-exchange",
      "diplomacy-clade-influence-and-coercion",
    ],
    forbiddenClades: [],
    preferredInstruments: ["covert-purchase", "intelligence", "proxy", "information"],
    allowedFamilyIds: [
      "covert-purchases",
      "foreign-intelligence",
      "proxy-armament",
      "information-diplomacy",
      "prisoner-exchange",
    ],
    realizationRegister: "broker-exchange",
    interest: "Monetize scarcity without becoming attributable",
  },
  {
    actorId: "cineric",
    name: "Cineric Directorate",
    role: "rival",
    allowedClades: [
      "diplomacy-clade-influence-and-coercion",
      "diplomacy-clade-commitments-and-alliances",
    ],
    forbiddenClades: [],
    preferredInstruments: ["sanctions", "statecraft", "legal-war", "exile"],
    allowedFamilyIds: [
      "sanctions",
      "statecraft",
      "legal-war",
      "exile-government",
      "treaties",
    ],
    realizationRegister: "rival-directorate",
    interest: "Isolate the state before defeating its field army",
  },
];

export const actorMetadataById = Object.fromEntries(
  DIPLOMACY_ACTOR_METADATA.map((actor) => [actor.actorId, actor]),
) as Record<string, DiplomacyActorMetadata>;

export const SHARED_DIPLOMACY_FAMILY_IDS = ["treaties", "prisoner-exchange"] as const;
