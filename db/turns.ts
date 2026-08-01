import {
  and,
  eq,
  exists,
  gt,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { AuthenticatedUser } from "../app/auth";
import { isCampaignIdentifier } from "../app/campaign-id";
import {
  accountDayBounds,
  accountDayKey,
  accountTurnWindow,
  validTimeZone,
} from "../app/account-time";
import { restoreCampaignState } from "../app/game";
import {
  persistedResolutionGrantId,
  resolutionAdvanceBelongsToGrant,
  resolutionGrantAuthorityIssue,
} from "../app/resolution-authority";
import {
  avaRequestStateSeal,
  executeAvaActionRequest,
} from "../app/ava/request-ir";
import {
  createAvaNexusSession,
  runAvaNexusRequest,
} from "../app/ava/nexus";
import { ensureAccount, settleTimeZoneForAccount } from "./accounts";
import { restoreActiveCampaignRow } from "./campaigns";
import { getDb } from "./index";
import { ensureResolutionAuthorityMigration } from "./resolution-migration";
import {
  accountTurnState,
  activeCampaigns,
  campaignResolutionGrants,
  users,
} from "./schema";

export type AccountTurnSnapshot = {
  godMode: boolean;
  dayKey: string;
  lastResolvedDayKey: string | null;
  canResolve: boolean;
  nextTurnAt: number;
  timeZone: string;
};

export type DailyResolutionGrant = {
  grantId: string;
  campaignId: string;
  campaignDay: number;
  accountDayKey: string;
};

export class DailyResolutionConflictError extends Error{
  readonly code="DAILY_RESOLUTION_STATE_CHANGED";
  constructor(message:string){
    super(message);
    this.name="DailyResolutionConflictError";
  }
}

export class DailyResolutionPreparationError extends Error{
  readonly code:string;
  constructor(code:string,cause:unknown){
    super("Campaign turnover preparation failed before a grant was issued.",{
      cause,
    });
    this.name="DailyResolutionPreparationError";
    this.code=code;
  }
}

const resolutionPreparationStage=async<T>(
  code:string,
  operation:()=>Promise<T>,
):Promise<T>=>{
  try{
    return await operation();
  }catch(error){
    if(error instanceof DailyResolutionConflictError)throw error;
    throw new DailyResolutionPreparationError(code,error);
  }
};

const resolutionTarget = (input: {
  campaignId?: unknown;
  campaignDay?: unknown;
  expectedRevision?:unknown;
  expectedStateSeal?:unknown;
}) => {
  const campaignId =
    isCampaignIdentifier(input.campaignId)
      ? input.campaignId
      : "";
  const campaignDay = Number(input.campaignDay);
  const expectedRevision=Number(input.expectedRevision);
  const expectedStateSeal=
    typeof input.expectedStateSeal==="string"&&input.expectedStateSeal.length<=120
      ?input.expectedStateSeal
      :"";
  if (
    !campaignId ||
    !Number.isInteger(campaignDay) ||
    campaignDay < 1 ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 1 ||
    !expectedStateSeal
  )
    throw new Error("A current campaign revision and state seal are required.");
  return { campaignId, campaignDay, expectedRevision, expectedStateSeal };
};

const grantFact = (
  grant:typeof campaignResolutionGrants.$inferSelect,
):DailyResolutionGrant=>({
  grantId:grant.id,
  campaignId:grant.campaignId,
  campaignDay:grant.campaignDay,
  accountDayKey:grant.accountDayKey,
});

const ensureTurnState = async (user: AuthenticatedUser) => {
  await ensureResolutionAuthorityMigration();
  const db = await getDb();
  const ownerEmail = await ensureAccount(user);
  await settleTimeZoneForAccount(db, ownerEmail);
  const now = Date.now();
  await db
    .insert(accountTurnState)
    .values({
      ownerEmail,
      godMode: false,
      lastResolvedDayKey: null,
      updatedAt: now,
    })
    .onConflictDoNothing();
  const account = (
    await db
      .select({
        timeZone: users.timeZone,
        godMode: accountTurnState.godMode,
        lastResolvedDayKey: accountTurnState.lastResolvedDayKey,
        nextTurnAt: accountTurnState.nextTurnAt,
      })
      .from(users)
      .innerJoin(
        accountTurnState,
        eq(accountTurnState.ownerEmail, users.email),
      )
      .where(eq(users.email, ownerEmail))
      .limit(1)
  )[0];
  return {
    db,
    ownerEmail,
    timeZone: validTimeZone(account?.timeZone) ? account.timeZone : "UTC",
    godMode: account?.godMode ?? false,
    lastResolvedDayKey: account?.lastResolvedDayKey ?? null,
    nextTurnAt: account?.nextTurnAt ?? null,
  };
};

const snapshotFrom = (
  state: Awaited<ReturnType<typeof ensureTurnState>>,
  now = Date.now(),
): AccountTurnSnapshot => {
  const window = accountTurnWindow({
    timeZone: state.timeZone,
    lastResolvedDayKey: state.lastResolvedDayKey,
    nextTurnAt: state.nextTurnAt,
    now,
  });
  return {
    godMode: state.godMode,
    dayKey: window.dayKey,
    lastResolvedDayKey: state.lastResolvedDayKey,
    canResolve: state.godMode || window.canResolve,
    nextTurnAt: window.nextTurnAt,
    timeZone: state.timeZone,
  };
};

export async function accountTurnSnapshot(user: AuthenticatedUser) {
  return snapshotFrom(await ensureTurnState(user));
}

export async function setGodMode(user: AuthenticatedUser, enabled: boolean) {
  const state = await ensureTurnState(user);
  const now = Date.now();
  const currentDayKey = accountDayKey(new Date(now), state.timeZone);
  const nextBoundary = accountDayBounds(state.timeZone, now).end;
  const lastResolvedDayKey = enabled
    ? state.lastResolvedDayKey
    : currentDayKey;
  const nextTurnAt = enabled ? state.nextTurnAt : nextBoundary;
  await state.db
    .update(accountTurnState)
    .set({
      godMode: enabled,
      lastResolvedDayKey,
      nextTurnAt,
      updatedAt: now,
    })
    .where(eq(accountTurnState.ownerEmail, state.ownerEmail));
  return snapshotFrom(
    {
      ...state,
      godMode: enabled,
      lastResolvedDayKey,
      nextTurnAt,
    },
    now,
  );
}

export async function claimDailyResolution(
  user: AuthenticatedUser,
  input: {
    campaignId?: unknown;
    campaignDay?: unknown;
    expectedRevision?:unknown;
    expectedStateSeal?:unknown;
  },
) {
  let target:ReturnType<typeof resolutionTarget>;
  try{
    target=resolutionTarget(input);
  }catch(error){
    throw new DailyResolutionPreparationError(
      "DAILY_RESOLUTION_TARGET_INVALID",
      error,
    );
  }
  const state = await resolutionPreparationStage(
    "DAILY_RESOLUTION_TURN_STATE_UNAVAILABLE",
    ()=>ensureTurnState(user),
  );
  const now = Date.now();
  const currentDayKey = accountDayKey(new Date(now), state.timeZone);
  const nextBoundary = accountDayBounds(state.timeZone, now).end;
  const snapshot=snapshotFrom(state,now);
  if(!snapshot.canResolve)
    return {
      allowed: false,
      ...snapshot,
    };
  const campaign=(await resolutionPreparationStage(
    "DAILY_RESOLUTION_CAMPAIGN_READ_FAILED",
    ()=>state.db
      .select()
      .from(activeCampaigns)
      .where(eq(activeCampaigns.ownerEmail,state.ownerEmail))
      .limit(1),
  ))[0];
  if(
    !campaign||
    campaign.campaignId!==target.campaignId||
    campaign.revision!==target.expectedRevision
  )throw new DailyResolutionConflictError(
    "The active campaign changed before turnover authority could be prepared.",
  );
  const restored=restoreCampaignState(JSON.parse(campaign.state) as unknown);
  const storedSeal=restored?avaRequestStateSeal(restored):"";
  if(
    !restored||
    restored.status!=="active"||
    restored.campaignId!==target.campaignId||
    restored.day!==target.campaignDay||
    storedSeal!==target.expectedStateSeal
  )throw new DailyResolutionConflictError(
    "The active campaign snapshot no longer matches the prepared resolution.",
  );
  const opportunityFractionPpm=Math.round(
    Math.max(
      0,
      Math.min(
        1,
        (now-campaign.clockStart)/
          Math.max(1,campaign.clockEnd-campaign.clockStart),
      ),
    )*1_000_000,
  );
  const reusable=(await resolutionPreparationStage(
    "DAILY_RESOLUTION_GRANT_READ_FAILED",
    ()=>state.db
      .select()
      .from(campaignResolutionGrants)
      .where(
        and(
          eq(campaignResolutionGrants.ownerEmail,state.ownerEmail),
          eq(campaignResolutionGrants.accountDayKey,currentDayKey),
          eq(campaignResolutionGrants.campaignId,target.campaignId),
          eq(campaignResolutionGrants.campaignDay,target.campaignDay),
          eq(campaignResolutionGrants.campaignRevision,target.expectedRevision),
          eq(campaignResolutionGrants.campaignStateSeal,storedSeal),
          isNull(campaignResolutionGrants.consumedAt),
          isNull(campaignResolutionGrants.invalidatedAt),
          gt(campaignResolutionGrants.expiresAt,now),
        ),
      )
      .limit(1),
  ))[0];
  if(reusable)
    return{
      allowed:true,
      ...snapshot,
      resolutionGrant:grantFact(reusable),
    };
  await resolutionPreparationStage(
    "DAILY_RESOLUTION_GRANT_INVALIDATION_FAILED",
    ()=>state.db
      .update(campaignResolutionGrants)
      .set({invalidatedAt:now})
      .where(
        and(
          eq(campaignResolutionGrants.ownerEmail,state.ownerEmail),
          eq(campaignResolutionGrants.accountDayKey,currentDayKey),
          isNull(campaignResolutionGrants.consumedAt),
          isNull(campaignResolutionGrants.invalidatedAt),
        ),
      ),
  );
  const grant:typeof campaignResolutionGrants.$inferInsert={
    id:crypto.randomUUID(),
    ownerEmail:state.ownerEmail,
    accountDayKey:currentDayKey,
    campaignId:target.campaignId,
    campaignDay:target.campaignDay,
    campaignRevision:target.expectedRevision,
    campaignStateSeal:storedSeal,
    opportunityFractionPpm,
    expiresAt:nextBoundary,
    createdAt:now,
  };
  await resolutionPreparationStage(
    "DAILY_RESOLUTION_GRANT_CREATE_FAILED",
    ()=>state.db.insert(campaignResolutionGrants).values(grant),
  );
  return {
    allowed: true,
    ...snapshot,
    resolutionGrant:grantFact({
      ...grant,
      consumedAt:null,
      invalidatedAt:null,
    }),
  };
}

const resolutionExecutionKey=async(grantId:string)=>{
  const digest=await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`delenda-resolution-execution:${grantId}`),
  );
  return `resolution-redemption:${Array.from(
    new Uint8Array(digest),
    (byte)=>byte.toString(16).padStart(2,"0"),
  ).join("")}`;
};

export async function redeemDailyResolution(
  user:AuthenticatedUser,
  input:{grantId?:unknown},
){
  const grantId=persistedResolutionGrantId(input.grantId);
  if(!grantId)throw new Error("A persisted resolution grant is required.");
  const state=await ensureTurnState(user);
  const now=Date.now();
  const currentDayKey=accountDayKey(new Date(now),state.timeZone);
  const nextBoundary=accountDayBounds(state.timeZone,now).end;
  const grant=(await state.db
    .select()
    .from(campaignResolutionGrants)
    .where(eq(campaignResolutionGrants.id,grantId))
    .limit(1))[0];
  if(resolutionGrantAuthorityIssue(grant,{
    grantId,
    ownerEmail:state.ownerEmail,
    accountDayKey:currentDayKey,
    now,
  }))throw new DailyResolutionConflictError(
    "The resolution grant is absent, expired, already used, or belongs to another account day.",
  );
  const campaign=(await state.db
    .select()
    .from(activeCampaigns)
    .where(eq(activeCampaigns.ownerEmail,state.ownerEmail))
    .limit(1))[0];
  const restored=campaign
    ?restoreCampaignState(JSON.parse(campaign.state) as unknown)
    :null;
  if(
    !campaign||
    !restored||
    campaign.campaignId!==grant.campaignId||
    campaign.revision!==grant.campaignRevision||
    restored.campaignId!==grant.campaignId||
    restored.day!==grant.campaignDay||
    restored.status!=="active"||
    avaRequestStateSeal(restored)!==grant.campaignStateSeal
  ){
    await state.db
      .update(campaignResolutionGrants)
      .set({invalidatedAt:now})
      .where(
        and(
          eq(campaignResolutionGrants.id,grant.id),
          eq(campaignResolutionGrants.ownerEmail,state.ownerEmail),
          isNull(campaignResolutionGrants.consumedAt),
          isNull(campaignResolutionGrants.invalidatedAt),
        ),
      );
    throw new DailyResolutionConflictError(
      "The campaign changed after resolution authority was prepared.",
    );
  }
  const resolutionGrant=grantFact(grant);
  const opportunityFraction=grant.opportunityFractionPpm/1_000_000;
  const executionKey=await resolutionExecutionKey(grant.id);
  const nexus=runAvaNexusRequest(
    executeAvaActionRequest(
      restored,
      {kind:"resolve-day"},
      {
        origin:"internal",
        idempotencyKey:executionKey,
        resolutionGrant,
      },
    ),
    {
      playerId:state.ownerEmail,
      campaignId:restored.campaignId,
      campaignRevision:avaRequestStateSeal(restored),
      surface:"internal",
      authority:"command",
      nowMs:now,
    },
    restored,
    createAvaNexusSession(true,"campaign"),
    opportunityFraction,
    {},
    {resolutionAuthority:"persisted-redemption"},
  );
  if(
    nexus.response.status!=="EXECUTED"||
    nexus.state.day!==restored.day+1||
    nexus.state.resolutionHistory.length!==restored.resolutionHistory.length+1
  )throw new DailyResolutionConflictError(
    "The canonical day resolution did not produce exactly one transition.",
  );
  const nextState=JSON.stringify(nexus.state);
  if(nextState.length>750_000)
    throw new Error("Resolved campaign state exceeds the account save limit.");

  const liveGrant=exists(
    state.db
      .select({id:campaignResolutionGrants.id})
      .from(campaignResolutionGrants)
      .where(
        and(
          eq(campaignResolutionGrants.id,grant.id),
          eq(campaignResolutionGrants.ownerEmail,state.ownerEmail),
          eq(campaignResolutionGrants.accountDayKey,currentDayKey),
          eq(campaignResolutionGrants.campaignRevision,grant.campaignRevision),
          eq(campaignResolutionGrants.campaignStateSeal,grant.campaignStateSeal),
          isNull(campaignResolutionGrants.consumedAt),
          isNull(campaignResolutionGrants.invalidatedAt),
          gt(campaignResolutionGrants.expiresAt,now),
        ),
      ),
  );
  const eligibleTurn=exists(
    state.db
      .select({ownerEmail:accountTurnState.ownerEmail})
      .from(accountTurnState)
      .where(
        and(
          eq(accountTurnState.ownerEmail,state.ownerEmail),
          or(
            eq(accountTurnState.godMode,true),
            lte(accountTurnState.nextTurnAt,now),
            and(
              isNull(accountTurnState.nextTurnAt),
              or(
                isNull(accountTurnState.lastResolvedDayKey),
                ne(accountTurnState.lastResolvedDayKey,currentDayKey),
              ),
            ),
          ),
        ),
      ),
  );
  const advancedCampaign=exists(
    state.db
      .select({ownerEmail:activeCampaigns.ownerEmail})
      .from(activeCampaigns)
      .where(
        and(
          eq(activeCampaigns.ownerEmail,state.ownerEmail),
          eq(activeCampaigns.campaignId,grant.campaignId),
          eq(activeCampaigns.revision,grant.campaignRevision+1),
          eq(activeCampaigns.lastResolutionGrantMarker,executionKey),
        ),
      ),
  );
  const consumedTurn=exists(
    state.db
      .select({ownerEmail:accountTurnState.ownerEmail})
      .from(accountTurnState)
      .where(
        and(
          eq(accountTurnState.ownerEmail,state.ownerEmail),
          or(
            eq(accountTurnState.godMode,true),
            and(
              eq(accountTurnState.lastResolvedDayKey,currentDayKey),
              eq(accountTurnState.nextTurnAt,nextBoundary),
            ),
          ),
        ),
      ),
  );
  const campaignWrite=state.db
    .update(activeCampaigns)
    .set({
      state:nextState,
      clockStart:accountDayBounds(state.timeZone,now).start,
      clockEnd:nextBoundary,
      revision:grant.campaignRevision+1,
      lastResolutionGrantMarker:executionKey,
      updatedAt:now,
    })
    .where(
      and(
        eq(activeCampaigns.ownerEmail,state.ownerEmail),
        eq(activeCampaigns.campaignId,grant.campaignId),
        eq(activeCampaigns.revision,grant.campaignRevision),
        liveGrant,
        eligibleTurn,
      ),
    )
    .returning();
  const turnWrite=state.db
    .update(accountTurnState)
    .set({
      lastResolvedDayKey:sql<string|null>`CASE WHEN ${accountTurnState.godMode} = 1 THEN ${accountTurnState.lastResolvedDayKey} ELSE ${currentDayKey} END`,
      nextTurnAt:sql<number|null>`CASE WHEN ${accountTurnState.godMode} = 1 THEN ${accountTurnState.nextTurnAt} ELSE ${nextBoundary} END`,
      updatedAt:now,
    })
    .where(
      and(
        eq(accountTurnState.ownerEmail,state.ownerEmail),
        liveGrant,
        advancedCampaign,
        eligibleTurn,
      ),
    )
    .returning({
      godMode:accountTurnState.godMode,
      lastResolvedDayKey:accountTurnState.lastResolvedDayKey,
      nextTurnAt:accountTurnState.nextTurnAt,
    });
  const grantWrite=state.db
    .update(campaignResolutionGrants)
    .set({consumedAt:now})
    .where(
      and(
        eq(campaignResolutionGrants.id,grant.id),
        eq(campaignResolutionGrants.ownerEmail,state.ownerEmail),
        liveGrant,
        advancedCampaign,
        consumedTurn,
      ),
    )
    .returning({id:campaignResolutionGrants.id});
  const[campaignRows,turnRows,grantRows]=await state.db.batch([
    campaignWrite,
    turnWrite,
    grantWrite,
  ]);
  if(
    campaignRows.length!==1||
    turnRows.length!==1||
    grantRows.length!==1||
    !resolutionAdvanceBelongsToGrant(campaignRows[0],{
      marker:executionKey,
      campaignId:grant.campaignId,
      campaignRevision:grant.campaignRevision,
    })
  ){
    if(
      campaignRows.length||
      turnRows.length||
      grantRows.length
    )throw new Error(
      "Atomic campaign redemption entered an inconsistent database state.",
    );
    await state.db
      .update(campaignResolutionGrants)
      .set({invalidatedAt:now})
      .where(
        and(
          eq(campaignResolutionGrants.id,grant.id),
          eq(campaignResolutionGrants.ownerEmail,state.ownerEmail),
          isNull(campaignResolutionGrants.consumedAt),
          isNull(campaignResolutionGrants.invalidatedAt),
        ),
      );
    throw new DailyResolutionConflictError(
      "Campaign resolution lost a concurrent revision race; no account day was consumed.",
    );
  }
  const resolvedTurn=snapshotFrom(
    {
      ...state,
      godMode:turnRows[0].godMode,
      lastResolvedDayKey:turnRows[0].lastResolvedDayKey,
      nextTurnAt:turnRows[0].nextTurnAt,
    },
    now,
  );
  return{
    allowed:true,
    accountKey:state.ownerEmail,
    campaign:restoreActiveCampaignRow(campaignRows[0]),
    turn:resolvedTurn,
    nexus:{
      response:nexus.response,
      text:nexus.text,
    },
  };
}
