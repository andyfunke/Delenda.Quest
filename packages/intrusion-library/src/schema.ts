export type IntrusionDeterminism = {
  hashInt(text: string): number;
  sha256Hex(text: string): string;
};

export type IntrusionDisclosureLine = {
  label: string;
  value: string;
};

export type IntrusionCampaignBinding = {
  campaignId: string;
  campaignSeed: number;
  day: number;
  sector: string;
  disclosureLines: readonly IntrusionDisclosureLine[];
};

export type AuthenticationDriftFamily = {
  id: string;
  schemaVersion: "intrusion-family/v1";
  contentVersion: string;
  spine: "authentication-drift";
  titleTemplate: string;
  target: string;
  nodeLexicon: readonly string[];
  routeLexicon: readonly string[];
  roleLexicon: readonly string[];
  requiredFailureCount: number;
  attemptsPerNode: number;
  decoyOffset: number;
  artifactNames: {
    mission: string;
    nodes: string;
    authenticationLog: string;
    authorizedKeys: string;
    observedKeys: string;
    report: string;
    proof: string;
  };
  mission: {
    objective: string;
    proofRules: readonly string[];
    coach: readonly string[];
  };
  hints: readonly (readonly string[])[];
  report: {
    heading: string;
    sourceTemplate: string;
    disclosureHeading: string;
    boundary: readonly string[];
  };
};

export type IntrusionFamily = AuthenticationDriftFamily;

export type IntrusionEvidenceArtifact = {
  name: string;
  kind: "mission" | "evidence";
  mediaType: "text/plain" | "text/csv";
  content: string;
};

export type IntrusionVerifierPredicate = {
  id: string;
  description: string;
  operation: "frequency" | "mismatch";
  artifactNames: readonly string[];
};

export type CompiledIntrusionIncident = {
  schemaVersion: "intrusion-incident/v1";
  familyId: string;
  familySchemaVersion: AuthenticationDriftFamily["schemaVersion"];
  contentVersion: string;
  id: string;
  title: string;
  target: string;
  artifacts: readonly IntrusionEvidenceArtifact[];
  resultArtifactNames: {
    report: string;
    proof: string;
  };
  scan: {
    heading: string;
    boundary: string;
    columns: readonly ["HOST", "STATE", "SERVICE"];
    rows: readonly {
      host: string;
      state: "up";
      service: string;
    }[];
  };
  verifier: {
    predicates: readonly IntrusionVerifierPredicate[];
    acceptedClaims: readonly string[];
    successExplanation: string;
  };
  hints: readonly string[];
  report: string;
  proof: string;
};
