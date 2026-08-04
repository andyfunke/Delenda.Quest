/**
 * Campaign operations adapter — thin typed surface over packages/campaign-operations.
 */

export type OperationSummary = {
  operationId: string;
  maneuverId: string;
  stageIndex: number;
  status: string;
};

export type MainThreadPrompt =
  | {
      kind: "routine";
      situation: { situationId: string; heat: "hot" | "medium" };
      continuingOperation: OperationSummary | null;
    }
  | {
      kind: "operation";
      operation: {
        operationId: string;
        maneuverId: string;
        stageIndex: number;
        heat: "hot" | "medium";
      };
    }
  | {
      kind: "romantic";
      arc: { arcId: string; beatIndex: number; heat: "hot" | "medium" };
      continuingOperation: OperationSummary | null;
    }
  | {
      kind: "escalatory";
      event: { eventId: string; heat: "hot" | "medium"; doomsday?: boolean };
      continuingOperation: OperationSummary | null;
    };

export {
  advanceOperationDay,
  mainThreadPrompt,
  migratePreMetastratumSave,
  resolveLegacyOneDayManeuver,
  semanticIdsEqual,
  startOperation,
} from "../packages/campaign-operations/src/index.mjs";
