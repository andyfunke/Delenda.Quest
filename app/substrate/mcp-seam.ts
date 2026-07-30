/**
 * Future MCP tool → application service mapping.
 * Compile-time / test fixture only — no public MCP server in this pass.
 */
import { validateStrategicPosture } from "./posture";

type ServiceFn = (...args: never[]) => unknown;

export const FUTURE_MCP_TOOLS = {
  get_daily_brief: "runAvaNexusRequest",
  get_campaign_status: "runAvaNexusRequest",
  get_available_orders: "runAvaNexusRequest",
  get_active_missions: "runAvaNexusRequest",
  get_pending_interrupts: "runAvaNexusRequest",
  get_service_record: "runAvaNexusRequest",
  ask_ava: "runAvaNexusRequest",
  get_action_options: "runAvaNexusRequest",
  evaluate_action: "runAvaNexusRequest",
  compare_actions: "runAvaNexusRequest",
  validate_strategic_posture: "validateStrategicPosture",
  prepare_order: "runAvaNexusRequest",
  confirm_order: "runAvaNexusRequest",
  cancel_prepared_order: "runAvaNexusRequest",
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
  runAvaNexusRequest: null as unknown as ServiceFn,
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
