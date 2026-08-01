import type { AuthenticationDriftFamily } from "../schema";

export const AUTHENTICATION_DRIFT_FAMILY: AuthenticationDriftFamily = {
  id: "authentication-drift",
  schemaVersion: "intrusion-family/v1",
  contentVersion: "authentication-drift/1.0.0",
  spine: "authentication-drift",
  titleTemplate: "Authentication Drift at {sector}",
  target: "relay-grid",
  nodeLexicon: [
    "relay-amber",
    "relay-cinder",
    "relay-glass",
    "relay-iron",
    "relay-marrow",
    "relay-umbra",
  ],
  routeLexicon: ["north", "reserve", "fires", "medical", "rail", "command"],
  roleLexicon: ["authentication-relay", "forward-relay"],
  requiredFailureCount: 4,
  attemptsPerNode: 4,
  decoyOffset: 3,
  artifactNames: {
    mission: "mission.txt",
    nodes: "nodes.csv",
    authenticationLog: "auth.log",
    authorizedKeys: "authorized-keys.csv",
    observedKeys: "observed-keys.csv",
    report: "intrusion-report.txt",
    proof: "proof.sha256",
  },
  mission: {
    objective:
      "A relay is failing authentication often enough to conceal a substituted key. Identify the one node supported by both evidence paths.",
    proofRules: [
      "The node has four AUTH=FAIL records in auth.log.",
      "The node's observed fingerprint differs from authorized-keys.csv.",
    ],
    coach: [
      "Start with: cat auth.log | grep AUTH=FAIL",
      "Then isolate NODE=, sort the names, and count adjacent duplicates.",
      "Compare the two key files with: diff authorized-keys.csv observed-keys.csv",
      "Submit with: hack submit NODE",
      "Ask for progressive help with: hack hint",
    ],
  },
  hints: [
    [
      "AVA COACH // CONCEPT",
      "grep keeps only failed authentication rows. cut extracts the NODE field. sort places identical nodes together. uniq -c counts each adjacent group.",
    ],
    [
      "AVA COACH // COMMAND SHAPE",
      "cat auth.log | grep AUTH=FAIL | cut -d \" \" -f 3 | sort | uniq -c",
      "The result with count 4 is only a candidate; corroborate it against both key files.",
    ],
    [
      "AVA COACH // COMPLETE PROCEDURE",
      "cat auth.log | grep AUTH=FAIL | cut -d \" \" -f 3 | sort | uniq -c",
      "diff authorized-keys.csv observed-keys.csv",
      "Use the same NODE in both results, then run: hack submit NODE",
    ],
  ],
  report: {
    heading: "INTRUSION REPORT",
    sourceTemplate: "SOURCE: {node} // VERIFIED KEY SUBSTITUTION",
    disclosureHeading: "RECOVERED ENEMY SIGNAL SNAPSHOT",
    boundary: [
      "BOUNDARY",
      "This is a one-time captured signal snapshot. It does not alter the campaign, predict a sealed branch, or create host/network access.",
    ],
  },
};
