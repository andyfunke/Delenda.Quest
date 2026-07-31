import type { GameState } from "../game";
import { parseDelendaCommand, type ParserDiscourse } from "./command-parser";
import type { CommandOperation, PlayerContext, SemanticResponse } from "./contracts";
import type { Channel } from "./gates";
import type { StrategicPosture } from "./posture";
import {
  DEFAULT_STRATEGIC_POSTURE,
  detectPostureConflicts,
  mergePosture,
} from "./posture";
import {
  evaluateChoices,
  getVisibleDocket,
} from "./services";
import { evaluateDirectiveChoices } from "./choice-evaluation";

/**
 * Differential reference interpreter only. Production adapters must enter
 * app/ava/nexus.ts; this module deliberately has no mutation dispatch.
 */
export const AVA_CLASSIC_REFERENCE_ONLY = true;

export type DiscourseCandidate = {
  choiceId: string;
  label: string;
  reason: string;
};

export type AvaResponsePlan =
  | { kind: "answer_fact"; factIds: string[] }
  | { kind: "list_visible_options"; channel: Channel; actorId?: string }
  | { kind: "explain_choice"; choiceId: string }
  | { kind: "recommend"; candidateIds: string[]; posture: StrategicPosture }
  | { kind: "rank"; candidateIds: string[]; posture: StrategicPosture }
  | {
      kind: "compare";
      candidateIds: [string, string, ...string[]];
      posture: StrategicPosture;
    }
  | { kind: "explain_consequence"; choiceId: string; consequenceId?: string }
  | { kind: "explain_constraint"; constraintId: string }
  | { kind: "explain_unavailability"; nodeId: string }
  | { kind: "clarify_reference"; candidates: DiscourseCandidate[] }
  | { kind: "clarify_priority"; conflict: ReturnType<typeof detectPostureConflicts>[number] }
  | { kind: "prepare_order"; choiceId: string }
  | { kind: "confirm_order"; proposalToken: string; idempotencyKey: string }
  | { kind: "recover_error"; errorCode: string };

export type AvaDiscourseState = {
  sessionId: string;
  playerId: string;
  campaignId: string;
  activeChannel?: Channel;
  activeActorId?: string;
  lastVisibleChoiceIds: string[];
  lastComparedChoiceIds: string[];
  lastRecommendationIds: string[];
  activePosture?: StrategicPosture;
  activeProposalToken?: string;
  activeProposalExpiresAt?: string;
  confirmationPhraseRendered?: boolean;
  lastOperation?: CommandOperation;
  campaignRevision?: string;
  updatedAt: string;
};

export type AvaClause =
  | { kind: "answer"; claimId: string; bindings: Record<string, string> }
  | { kind: "because"; claimId: string; bindings: Record<string, string> }
  | { kind: "contrast"; leftId: string; rightId: string; dimension: string }
  | { kind: "cost"; consequenceId: string }
  | { kind: "risk"; consequenceId: string }
  | { kind: "uncertainty"; uncertaintyId: string }
  | { kind: "question"; clarificationCode: string }
  | { kind: "recovery"; commandExample: string };

export type AvaRealizationPlan = {
  speechAct:
    | "inform"
    | "recommend"
    | "compare"
    | "warn"
    | "clarify"
    | "confirm"
    | "refuse";
  certainty: "fact" | "deterministic_inference" | "conditional" | "unknown";
  clauses: AvaClause[];
  register: "ava_classic";
  length: "compact" | "brief" | "full";
};

const CLAUSE_REALIZATIONS: Record<string, string[]> = {
  "answer.recommend": [
    "I recommend {choice}.",
    "The strongest legal option is {choice}.",
  ],
  "because.priority": [
    "Because your posture weights {dimension} heavily.",
    "That ranking follows from {dimension}.",
  ],
  "contrast.score": [
    "{left} outranks {right} on {dimension}.",
    "{left} separates from {right} mainly on {dimension}.",
  ],
  "question.clarify": [
    "Which of these did you mean: {options}?",
    "Clarify the reference among: {options}.",
  ],
  "recovery.nearby": [
    "I can determine part of that. Try: {example}",
    "Nearby valid form: {example}",
  ],
};

export const realizeClause = (
  clause: AvaClause,
  bindings: Record<string, string>,
  variantIndex = 0,
) => {
  const key =
    clause.kind === "answer"
      ? `answer.${clause.claimId}`
      : clause.kind === "because"
        ? `because.${clause.claimId}`
        : clause.kind === "contrast"
          ? `contrast.${clause.dimension}`
          : clause.kind === "question"
            ? `question.${clause.clarificationCode}`
            : clause.kind === "recovery"
              ? "recovery.nearby"
              : `${clause.kind}`;
  const templates = CLAUSE_REALIZATIONS[key] ?? ["{text}"];
  const template = templates[variantIndex % templates.length] ?? templates[0];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => bindings[name] ?? "");
};

export const initialDiscourse = (
  ctx: PlayerContext,
  sessionId: string,
): AvaDiscourseState => ({
  sessionId,
  playerId: ctx.playerId,
  campaignId: ctx.campaignId,
  lastVisibleChoiceIds: [],
  lastComparedChoiceIds: [],
  lastRecommendationIds: [],
  activePosture: DEFAULT_STRATEGIC_POSTURE,
  updatedAt: new Date(ctx.nowMs).toISOString(),
});

const discourseToParser = (discourse: AvaDiscourseState): ParserDiscourse => ({
  activeChannel: discourse.activeChannel,
  activeActorId: discourse.activeActorId,
  lastVisibleChoiceIds: discourse.lastVisibleChoiceIds,
  activeProposalToken: discourse.activeProposalToken,
  activeProposalExpiresAt: discourse.activeProposalExpiresAt,
  confirmationPhraseRendered: discourse.confirmationPhraseRendered,
});

const ordinal = (text: string) => {
  const map: Record<string, number> = {
    first: 0,
    second: 1,
    third: 2,
    fourth: 3,
    "1st": 0,
    "2nd": 1,
    "3rd": 2,
  };
  for (const [key, value] of Object.entries(map)) {
    if (text.includes(key)) return value;
  }
  return null;
};

export const compileAvaClassicPlan = (
  utterance: string,
  state: GameState,
  discourse: AvaDiscourseState,
): AvaResponsePlan => {
  const normalized = utterance.trim().toLowerCase();
  const posture = discourse.activePosture ?? DEFAULT_STRATEGIC_POSTURE;

  if (
    normalized.includes("what should i do") ||
    normalized === "what does ava recommend?" ||
    normalized === "what does ava recommend"
  ) {
    return {
      kind: "recommend",
      candidateIds: discourse.lastVisibleChoiceIds,
      posture: normalized.includes("production")
        ? mergePosture(posture, {
            priorities: { production_integrity: "critical" },
            objective: "preserve_industrial_capacity",
            confirmation: "inferred",
          })
        : posture,
    };
  }

  if (normalized.includes("compare the first and third")) {
    const first = discourse.lastVisibleChoiceIds[0];
    const third = discourse.lastVisibleChoiceIds[2];
    if (first && third) {
      return { kind: "compare", candidateIds: [first, third], posture };
    }
    return {
      kind: "clarify_reference",
      candidates: discourse.lastVisibleChoiceIds.map((choiceId) => ({
        choiceId,
        label: choiceId,
        reason: "visible",
      })),
    };
  }

  if (normalized.startsWith("prepare the second") || normalized.includes("prepare the second option")) {
    const choiceId = discourse.lastVisibleChoiceIds[1];
    if (!choiceId) return { kind: "recover_error", errorCode: "NO_SECOND_OPTION" };
    return { kind: "prepare_order", choiceId };
  }

  if (normalized.includes("cancel that")) {
    if (!discourse.activeProposalToken) {
      return { kind: "recover_error", errorCode: "NO_ACTIVE_PROPOSAL" };
    }
    return {
      kind: "confirm_order",
      proposalToken: discourse.activeProposalToken,
      idempotencyKey: "cancel-via-discourse",
    };
  }

  if (normalized.includes("why is") || normalized.startsWith("why not")) {
    const ids = discourse.lastRecommendationIds.length
      ? discourse.lastRecommendationIds
      : discourse.lastVisibleChoiceIds;
    if (ids[0]) return { kind: "explain_choice", choiceId: ids[0] };
    return { kind: "recover_error", errorCode: "NO_CHOICE_CONTEXT" };
  }

  if (normalized.includes("which option is cheapest")) {
    return { kind: "rank", candidateIds: discourse.lastVisibleChoiceIds, posture };
  }

  if (normalized.includes("longest-term benefit")) {
    return {
      kind: "rank",
      candidateIds: discourse.lastVisibleChoiceIds,
      posture: mergePosture(posture, { horizon: "long", confirmation: "inferred" }),
    };
  }

  if (normalized.includes("northern faction") || normalized.includes("with the northern")) {
    return { kind: "list_visible_options", channel: "diplomacy", actorId: "orison" };
  }

  if (normalized.includes("show only options i can afford")) {
    return { kind: "list_visible_options", channel: discourse.activeChannel ?? "production" };
  }

  if (normalized.includes("now rank them again")) {
    return {
      kind: "rank",
      candidateIds: discourse.lastVisibleChoiceIds,
      posture: discourse.activePosture ?? posture,
    };
  }

  const conflicts = detectPostureConflicts(posture, {
    offensivePathsRequireHighExposure: state.front < -2,
    productionDependsOnCurrentSupply: true,
  });
  if (normalized.includes("i can lose territory") && conflicts[0]) {
    return { kind: "clarify_priority", conflict: conflicts[0] };
  }

  const index = ordinal(normalized);
  if (index !== null && normalized.includes("the ") && discourse.lastVisibleChoiceIds.length) {
    const choiceId = discourse.lastVisibleChoiceIds[index];
    if (!choiceId) {
      return {
        kind: "clarify_reference",
        candidates: discourse.lastVisibleChoiceIds.map((id) => ({
          choiceId: id,
          label: id,
          reason: "ordinal-out-of-range",
        })),
      };
    }
    if (normalized.includes("prepare")) return { kind: "prepare_order", choiceId };
    return { kind: "explain_choice", choiceId };
  }

  const parsed = parseDelendaCommand(utterance, discourseToParser(discourse));
  if (!parsed.ok) return { kind: "recover_error", errorCode: parsed.code };
  if (parsed.command.operation === "SHOW_DOCKET") {
    return {
      kind: "list_visible_options",
      channel: parsed.command.channel ?? "production",
      actorId: parsed.command.actorId,
    };
  }
  if (parsed.command.operation === "PREPARE") {
    return {
      kind: "prepare_order",
      choiceId: parsed.command.targetIds?.[0] ?? "",
    };
  }
  if (parsed.command.operation === "COMPARE" && (parsed.command.targetIds?.length ?? 0) >= 2) {
    const ids = parsed.command.targetIds as [string, string, ...string[]];
    return { kind: "compare", candidateIds: ids, posture };
  }
  if (parsed.command.operation === "ADVISE" || parsed.command.operation === "RANK") {
    return {
      kind: parsed.command.operation === "RANK" ? "rank" : "recommend",
      candidateIds: discourse.lastVisibleChoiceIds,
      posture: parsed.command.posture ?? posture,
    };
  }
  return { kind: "answer_fact", factIds: ["campaign.status"] };
};

export const runAvaClassic = (
  utterance: string,
  ctx: PlayerContext,
  state: GameState,
  discourse: AvaDiscourseState,
): {
  plan: AvaResponsePlan;
  realization: AvaRealizationPlan;
  response: SemanticResponse<unknown>;
  state: GameState;
  discourse: AvaDiscourseState;
} => {
  const revision = `${state.campaignId}:${state.day}:${state.actions}`;
  let nextDiscourse = { ...discourse };
  if (discourse.campaignRevision && discourse.campaignRevision !== revision) {
    nextDiscourse = {
      ...nextDiscourse,
      lastVisibleChoiceIds: [],
      lastComparedChoiceIds: [],
      lastRecommendationIds: [],
      activeProposalToken: undefined,
      activeProposalExpiresAt: undefined,
      confirmationPhraseRendered: false,
    };
  }
  nextDiscourse.campaignRevision = revision;

  const plan = compileAvaClassicPlan(utterance, state, nextDiscourse);
  let nextState = state;
  let response: SemanticResponse<unknown>;
  let realization: AvaRealizationPlan;

  const ensureVisible = (channel: Channel, actorId?: string) => {
    const result = getVisibleDocket(ctx, nextState, channel, actorId);
    nextState = result.state;
    nextDiscourse.activeChannel = channel;
    nextDiscourse.activeActorId = actorId;
    nextDiscourse.lastVisibleChoiceIds = result.response.fact.choiceIds;
    return result.response;
  };

  switch (plan.kind) {
    case "list_visible_options": {
      response = ensureVisible(plan.channel, plan.actorId);
      realization = {
        speechAct: "inform",
        certainty: "fact",
        register: "ava_classic",
        length: "brief",
        clauses: [
          {
            kind: "answer",
            claimId: "recommend",
            bindings: {
              choice: ((response.fact as { choiceIds?: string[] }).choiceIds ?? []).join(", "),
            },
          },
        ],
      };
      break;
    }
    case "recommend":
    case "rank": {
      if (!plan.candidateIds.length) ensureVisible(nextDiscourse.activeChannel ?? "production");
      const ids = plan.candidateIds.length
        ? plan.candidateIds
        : nextDiscourse.lastVisibleChoiceIds;
      const conflicts = plan.posture.unresolvedConflicts.filter((item) => item.material);
      if (conflicts.length && plan.kind === "recommend") {
        response = {
          status: "AMBIGUOUS",
          fact: { conflict: conflicts[0] },
          rendering: {
            compact: "CLARIFY PRIORITY",
            brief: conflicts[0].clarification,
          },
          campaignRevision: revision,
        };
        realization = {
          speechAct: "clarify",
          certainty: "conditional",
          register: "ava_classic",
          length: "brief",
          clauses: [{ kind: "question", clarificationCode: "clarify" }],
        };
        break;
      }
      const evaluated = evaluateDirectiveChoices(nextState, ids, plan.posture).sort(
        (a, b) => b.score - a.score || a.choiceId.localeCompare(b.choiceId),
      );
      const top = evaluated[0];
      const tied = evaluated.filter((item) => item.score === top?.score);
      nextDiscourse.lastRecommendationIds = evaluated.map((item) => item.choiceId);
      nextDiscourse.activePosture = plan.posture;
      response = {
        status: "OK",
        fact: { ranked: evaluated, tie: tied.length > 1 },
        rendering: {
          compact: tied.length > 1 ? "TIE" : `RECOMMEND ${top?.choiceId ?? ""}`,
          brief:
            tied.length > 1
              ? `Explicit tie between ${tied.map((item) => item.choiceId).join(" and ")}.`
              : `Recommend ${top?.choiceId}.`,
        },
        campaignRevision: revision,
      };
      realization = {
        speechAct: "recommend",
        certainty: "deterministic_inference",
        register: "ava_classic",
        length: "brief",
        clauses: [
          {
            kind: "answer",
            claimId: "recommend",
            bindings: { choice: top?.choiceId ?? "" },
          },
          {
            kind: "because",
            claimId: "priority",
            bindings: { dimension: "priorityFit" },
          },
        ],
      };
      break;
    }
    case "compare": {
      const evaluated = evaluateChoices(ctx, nextState, plan.candidateIds, plan.posture);
      const rows = evaluated.fact.evaluations;
      const left = rows[0];
      const right = rows[1];
      let dimension = "score";
      if (left && right) {
        const diffs = Object.entries(left.components).map(([key, value]) => ({
          key,
          delta: Math.abs(value - (right.components as Record<string, number>)[key]),
        }));
        diffs.sort((a, b) => b.delta - a.delta);
        dimension = diffs[0]?.key ?? "score";
      }
      nextDiscourse.lastComparedChoiceIds = plan.candidateIds;
      response = {
        status: "OK",
        fact: { evaluations: rows, dimension },
        rendering: {
          compact: `COMPARE ${plan.candidateIds.join(" vs ")}`,
          brief: `${left?.choiceId ?? ""} vs ${right?.choiceId ?? ""} differ most on ${dimension}.`,
        },
        campaignRevision: revision,
      };
      realization = {
        speechAct: "compare",
        certainty: "deterministic_inference",
        register: "ava_classic",
        length: "brief",
        clauses: [
          {
            kind: "contrast",
            leftId: left?.choiceId ?? "",
            rightId: right?.choiceId ?? "",
            dimension,
          },
        ],
      };
      break;
    }
    case "prepare_order": {
      response = {
        status: "FORBIDDEN",
        fact: { choiceId: plan.choiceId, referenceOnly: true },
        rendering: {
          compact: "REFERENCE ONLY",
          brief:
            "Ava Classic is a read-only reference interpreter. Prepare through the Nexus.",
        },
        campaignRevision: revision,
        recovery: {
          code: "AVA_CLASSIC_REFERENCE_ONLY",
          instruction: "Route the typed action through the Ava Nexus.",
        },
      };
      realization = {
        speechAct: "refuse",
        certainty: "fact",
        register: "ava_classic",
        length: "compact",
        clauses: [{ kind: "recovery", commandExample: "prepare <choice-id>" }],
      };
      break;
    }
    case "clarify_reference":
    case "clarify_priority": {
      response = {
        status: "AMBIGUOUS",
        fact: plan,
        rendering: {
          compact: "CLARIFY",
          brief:
            plan.kind === "clarify_priority"
              ? plan.conflict.clarification
              : `Which reference: ${plan.candidates.map((item) => item.choiceId).join(", ")}?`,
        },
        campaignRevision: revision,
      };
      realization = {
        speechAct: "clarify",
        certainty: "unknown",
        register: "ava_classic",
        length: "brief",
        clauses: [{ kind: "question", clarificationCode: "clarify" }],
      };
      break;
    }
    case "explain_choice": {
      const evaluated = evaluateDirectiveChoices(nextState, [plan.choiceId], nextDiscourse.activePosture ?? DEFAULT_STRATEGIC_POSTURE)[0];
      response = {
        status: "OK",
        fact: evaluated,
        rendering: {
          compact: `EXPLAIN ${plan.choiceId}`,
          brief: `Visible tradeoffs: ${(evaluated?.knownBenefits ?? []).map((item) => item.claim).join("; ") || "none disclosed"}.`,
        },
        campaignRevision: revision,
      };
      realization = {
        speechAct: "inform",
        certainty: "deterministic_inference",
        register: "ava_classic",
        length: "full",
        clauses: [
          {
            kind: "because",
            claimId: "priority",
            bindings: { dimension: "constraintRelief" },
          },
        ],
      };
      break;
    }
    case "recover_error": {
      response = {
        status: "AMBIGUOUS",
        fact: { errorCode: plan.errorCode },
        rendering: {
          compact: "RECOVER",
          brief: realizeClause(
            { kind: "recovery", commandExample: "advise production" },
            { example: "advise production / compare <id> <id> / prepare <id>" },
          ),
        },
        campaignRevision: revision,
        recovery: {
          code: plan.errorCode,
          instruction: "Provide a declared grammar form.",
          validExamples: ["What should I do?", "advise production", "compare <id> <id>"],
        },
      };
      realization = {
        speechAct: "refuse",
        certainty: "unknown",
        register: "ava_classic",
        length: "brief",
        clauses: [{ kind: "recovery", commandExample: "advise production" }],
      };
      break;
    }
    default: {
      if (plan.kind === "confirm_order") {
        response = {
          status: "FORBIDDEN",
          fact: { proposalToken: plan.proposalToken, referenceOnly: true },
          rendering: {
            compact: "REFERENCE ONLY",
            brief:
              "Ava Classic cannot confirm or cancel effects. Use the Nexus.",
          },
          campaignRevision: revision,
          recovery: {
            code: "AVA_CLASSIC_REFERENCE_ONLY",
            instruction: "Route confirmation through the Ava Nexus.",
          },
        };
        realization = {
          speechAct: "refuse",
          certainty: "fact",
          register: "ava_classic",
          length: "compact",
          clauses: [],
        };
        break;
      }
      const parsed = parseDelendaCommand(utterance, discourseToParser(nextDiscourse));
      if (!parsed.ok) {
        response = {
          status: parsed.status,
          fact: null,
          rendering: { compact: parsed.code, brief: parsed.instruction },
          campaignRevision: revision,
          recovery: {
            code: parsed.code,
            instruction: parsed.instruction,
            validExamples: parsed.examples,
          },
        };
      } else {
        response = {
          status: "FORBIDDEN",
          fact: {
            operation: parsed.command.operation,
            referenceOnly: true,
          },
          rendering: {
            compact: "REFERENCE ONLY",
            brief:
              "That command is outside the read-only reference interpreter. Use the Nexus.",
          },
          campaignRevision: revision,
          recovery: {
            code: "AVA_CLASSIC_REFERENCE_ONLY",
            instruction: "Route the command through the Ava Nexus.",
          },
        };
      }
      realization = {
        speechAct: "inform",
        certainty: "fact",
        register: "ava_classic",
        length: "brief",
        clauses: [{ kind: "answer", claimId: "recommend", bindings: { choice: "status" } }],
      };
    }
  }

  nextDiscourse.updatedAt = new Date(ctx.nowMs).toISOString();
  return { plan, realization, response, state: nextState, discourse: nextDiscourse };
};
