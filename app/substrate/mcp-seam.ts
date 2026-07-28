/**
 * Future MCP tool → application service mapping.
 * Compile-time / test fixture only — no public MCP server in this pass.
 */
import type {
  cancelPreparedOrder,
  confirmOrder,
  evaluateChoices,
  getCampaignStatus,
  getDailyBrief,
  getVisibleDocket,
  prepareOrder,
  rankVisibleChoices,
} from "./services";
import { validateStrategicPosture } from "./posture";

type ServiceFn = (...args: never[]) => unknown;

export const FUTURE_MCP_TOOLS = {
  get_daily_brief: "getDailyBrief",
  get_campaign_status: "getCampaignStatus",
  get_available_orders: "getVisibleDocket",
  get_active_missions: "getVisibleDocket",
  get_pending_interrupts: "getDailyBrief",
  get_service_record: "getCampaignStatus",
  ask_ava: "rankVisibleChoices",
  get_action_options: "getVisibleDocket",
  evaluate_action: "evaluateChoices",
  compare_actions: "evaluateChoices",
  validate_strategic_posture: "validateStrategicPosture",
  prepare_order: "prepareOrder",
  confirm_order: "confirmOrder",
  cancel_prepared_order: "cancelPreparedOrder",
} as const;

export type FutureMcpTool = keyof typeof FUTURE_MCP_TOOLS;

export const MCP_AUTHORITY = {
  Observer: ["get_daily_brief", "get_campaign_status"] as FutureMcpTool[],
  Staff: [
    "get_daily_brief",
    "get_campaign_status",
    "get_available_orders",
    "get_active_missions",
    "get_pending_interrupts",
    "get_service_record",
    "ask_ava",
    "get_action_options",
    "evaluate_action",
    "compare_actions",
    "validate_strategic_posture",
  ] as FutureMcpTool[],
  Command: [
    "prepare_order",
    "confirm_order",
    "cancel_prepared_order",
  ] as FutureMcpTool[],
  Automation: [] as FutureMcpTool[],
};

const SERVICE_REGISTRY = {
  getDailyBrief: null as unknown as typeof getDailyBrief,
  getCampaignStatus: null as unknown as typeof getCampaignStatus,
  getVisibleDocket: null as unknown as typeof getVisibleDocket,
  evaluateChoices: null as unknown as typeof evaluateChoices,
  rankVisibleChoices: null as unknown as typeof rankVisibleChoices,
  prepareOrder: null as unknown as typeof prepareOrder,
  confirmOrder: null as unknown as typeof confirmOrder,
  cancelPreparedOrder: null as unknown as typeof cancelPreparedOrder,
  validateStrategicPosture,
} satisfies Record<string, ServiceFn | typeof validateStrategicPosture>;

export const mcpToolServiceName = (tool: FutureMcpTool) => FUTURE_MCP_TOOLS[tool];

export const assertMcpSeam = () => {
  const missing: string[] = [];
  for (const [tool, serviceName] of Object.entries(FUTURE_MCP_TOOLS)) {
    if (!(serviceName in SERVICE_REGISTRY)) missing.push(`${tool} -> ${serviceName}`);
  }
  return missing;
};

/** Import boundary: this module must not import web or SSH adapters. */
export const MCP_SEAM_FORBIDDEN_IMPORTS = [
  "app/GameClient",
  "app/BriefingInterface",
  "packages/ssh-server",
] as const;
