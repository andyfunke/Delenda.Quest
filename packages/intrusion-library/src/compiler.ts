import { INTRUSION_CATALOG } from "./catalog";
import type {
  AuthenticationDriftFamily,
  CompiledIntrusionIncident,
  IntrusionCampaignBinding,
  IntrusionDeterminism,
  IntrusionFamily,
} from "./schema";

const replaceTokens = (template: string, tokens: Record<string, string>) =>
  Object.entries(tokens).reduce(
    (rendered, [token, value]) => rendered.replaceAll(`{${token}}`, value),
    template,
  );

const fingerprint = (tools: IntrusionDeterminism, value: string) =>
  tools.sha256Hex(value).slice(0, 16);

const familyForId = (familyId: string): IntrusionFamily => {
  const family = INTRUSION_CATALOG.find((candidate) => candidate.id === familyId);
  if (!family) throw new Error(`unknown intrusion family: ${familyId}`);
  return family;
};

export const validateIntrusionCatalog = () => {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const family of INTRUSION_CATALOG) {
    if (ids.has(family.id)) errors.push(`duplicate family id: ${family.id}`);
    ids.add(family.id);
    if (!family.contentVersion.startsWith(`${family.id}/`))
      errors.push(`${family.id}: contentVersion must be namespaced to the family`);
    if (family.nodeLexicon.length < 4)
      errors.push(`${family.id}: at least four nodes are required`);
    if (family.routeLexicon.length !== family.nodeLexicon.length)
      errors.push(`${family.id}: route and node vocabularies must have equal length`);
    if (!family.roleLexicon.length)
      errors.push(`${family.id}: at least one role is required`);
    if (
      family.requiredFailureCount < 1 ||
      family.requiredFailureCount > family.attemptsPerNode
    )
      errors.push(`${family.id}: required failure count must fit the attempt count`);
    if (family.hints.length !== 3 || family.hints.some((hint) => !hint.length))
      errors.push(`${family.id}: exactly three non-empty coaching levels are required`);
    const artifactNames = Object.values(family.artifactNames);
    if (new Set(artifactNames).size !== artifactNames.length)
      errors.push(`${family.id}: artifact names must be unique`);
    if (artifactNames.some((name) => name.includes("/") || name.includes("..")))
      errors.push(`${family.id}: artifact names must be safe relative names`);
  }
  return errors;
};

const compileAuthenticationDrift = (
  binding: IntrusionCampaignBinding,
  family: AuthenticationDriftFamily,
  tools: IntrusionDeterminism,
): CompiledIntrusionIncident => {
  const compromisedIndex =
    tools.hashInt(
      `${binding.campaignSeed}:${binding.campaignId}:${binding.day}:relay-compromise`,
    ) % family.nodeLexicon.length;
  const decoyIndex =
    (compromisedIndex + family.decoyOffset) % family.nodeLexicon.length;
  const compromisedNode = family.nodeLexicon[compromisedIndex];
  const id = `SIG-${tools
    .hashInt(`${binding.campaignId}:${binding.day}:${family.target}`)
    .toString(16)
    .padStart(8, "0")}`;
  const authorized = family.nodeLexicon.map((node) => ({
    node,
    key: fingerprint(tools, `${binding.campaignSeed}:${node}:authorized`),
  }));
  const nodesCsv = [
    "node,sector,role,declared_route",
    ...family.nodeLexicon.map(
      (node, index) =>
        `${node},${binding.sector.replaceAll(",", " ")},${family.roleLexicon[index % family.roleLexicon.length]},${family.routeLexicon[index]}`,
    ),
  ].join("\n");
  const authorizedKeysCsv = [
    "node,fingerprint",
    ...authorized.map((entry) => `${entry.node},${entry.key}`),
  ].join("\n");
  const observedKeysCsv = [
    "node,fingerprint",
    ...authorized.map((entry, index) =>
      `${entry.node},${
        index === compromisedIndex
          ? fingerprint(tools, `${binding.campaignSeed}:${entry.node}:substituted`)
          : entry.key
      }`,
    ),
  ].join("\n");
  const authRows: string[] = [];
  let minute = 3;
  family.nodeLexicon.forEach((node, index) => {
    const failures =
      index === compromisedIndex
        ? family.requiredFailureCount
        : index === decoyIndex
          ? Math.max(1, family.requiredFailureCount - 2)
          : index % 3;
    for (let attempt = 0; attempt < family.attemptsPerNode; attempt += 1) {
      const failed = attempt < failures;
      authRows.push(
        `04:${String(minute).padStart(2, "0")}:${String((index * 11 + attempt * 7) % 60).padStart(2, "0")} AUTH=${failed ? "FAIL" : "PASS"} NODE=${node} ROUTE=${family.routeLexicon[index]} KEY=${
          index === compromisedIndex
            ? fingerprint(tools, `${binding.campaignSeed}:${node}:substituted`)
            : authorized[index].key
        }`,
      );
      minute = (minute + 2) % 60;
    }
  });
  const authLog = authRows.sort((left, right) => left.localeCompare(right)).join("\n");
  const mission = [
    `SIGNALS INCIDENT ${id}`,
    `SECTOR: ${binding.sector.toUpperCase()}`,
    "",
    family.mission.objective,
    "",
    "PROOF RULE",
    ...family.mission.proofRules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "AVA COACH",
    ...family.mission.coach,
  ].join("\n");
  const report = [
    `${family.report.heading} ${id}`,
    replaceTokens(family.report.sourceTemplate, {
      node: compromisedNode.toUpperCase(),
    }),
    `SECTOR: ${binding.sector.toUpperCase()}`,
    "",
    family.report.disclosureHeading,
    ...binding.disclosureLines.map((line) => `${line.label}: ${line.value}`),
    "",
    ...family.report.boundary,
  ].join("\n");
  const proof = tools.sha256Hex(
    [
      "DELENDA-HACK-PROOF-V1",
      binding.campaignId,
      id,
      compromisedNode,
      authorizedKeysCsv,
      observedKeysCsv,
    ].join("\n"),
  );

  return {
    schemaVersion: "intrusion-incident/v1",
    familyId: family.id,
    familySchemaVersion: family.schemaVersion,
    contentVersion: family.contentVersion,
    id,
    title: replaceTokens(family.titleTemplate, { sector: binding.sector }),
    target: family.target,
    artifacts: [
      {
        name: family.artifactNames.mission,
        kind: "mission",
        mediaType: "text/plain",
        content: mission,
      },
      {
        name: family.artifactNames.nodes,
        kind: "evidence",
        mediaType: "text/csv",
        content: nodesCsv,
      },
      {
        name: family.artifactNames.authenticationLog,
        kind: "evidence",
        mediaType: "text/plain",
        content: authLog,
      },
      {
        name: family.artifactNames.authorizedKeys,
        kind: "evidence",
        mediaType: "text/csv",
        content: authorizedKeysCsv,
      },
      {
        name: family.artifactNames.observedKeys,
        kind: "evidence",
        mediaType: "text/csv",
        content: observedKeysCsv,
      },
    ],
    resultArtifactNames: {
      report: family.artifactNames.report,
      proof: family.artifactNames.proof,
    },
    scan: {
      heading: `NMAP // ${family.target} // SIMULATED RELAY INVENTORY`,
      boundary: "No packets or sockets left Delenda Quest.",
      columns: ["HOST", "STATE", "SERVICE"],
      rows: family.nodeLexicon.map((node, index) => ({
        host: node,
        state: "up" as const,
        service: family.roleLexicon[index % family.roleLexicon.length] === "forward-relay"
          ? "signal-forwarder"
          : "auth-relay",
      })),
    },
    verifier: {
      predicates: [
        {
          id: "required-authentication-failures",
          description: `The claim has exactly ${family.requiredFailureCount} failed authentication records.`,
          operation: "frequency",
          artifactNames: [family.artifactNames.authenticationLog],
        },
        {
          id: "substituted-key-fingerprint",
          description: "The claim has different authorized and observed fingerprints.",
          operation: "mismatch",
          artifactNames: [
            family.artifactNames.authorizedKeys,
            family.artifactNames.observedKeys,
          ],
        },
      ],
      acceptedClaims: [compromisedNode],
      successExplanation:
        "The repeated failures and substituted fingerprint converge on one relay.",
    },
    hints: family.hints.map((hint) => hint.join("\n")),
    report,
    proof,
  };
};

export const compileIntrusionIncident = (options: {
  binding: IntrusionCampaignBinding;
  tools: IntrusionDeterminism;
  familyId?: string;
}) => {
  const errors = validateIntrusionCatalog();
  if (errors.length) throw new Error(`invalid intrusion catalog: ${errors.join("; ")}`);
  const family = familyForId(options.familyId ?? INTRUSION_CATALOG[0].id);
  switch (family.spine) {
    case "authentication-drift":
      return compileAuthenticationDrift(options.binding, family, options.tools);
  }
};
