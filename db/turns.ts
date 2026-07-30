import { and, eq, isNull, lte, ne, or } from "drizzle-orm";
import type { AuthenticatedUser } from "../app/auth";
import {
  accountDayBounds,
  accountDayKey,
  accountTurnWindow,
  validTimeZone,
} from "../app/account-time";
import { ensureAccount, settleTimeZoneForAccount } from "./accounts";
import { getDb } from "./index";
import { accountTurnState, users } from "./schema";

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

const resolutionTarget = (input: {
  campaignId?: unknown;
  campaignDay?: unknown;
}) => {
  const campaignId =
    typeof input.campaignId === "string" &&
    /^[a-zA-Z0-9._:-]{1,100}$/.test(input.campaignId)
      ? input.campaignId
      : "";
  const campaignDay = Number(input.campaignDay);
  if (!campaignId || !Number.isInteger(campaignDay) || campaignDay < 1)
    throw new Error("A current campaign and day are required.");
  return { campaignId, campaignDay };
};

const grantFor = (
  target: ReturnType<typeof resolutionTarget>,
  accountDayKey: string,
): DailyResolutionGrant => ({
  grantId: crypto.randomUUID(),
  campaignId: target.campaignId,
  campaignDay: target.campaignDay,
  accountDayKey,
});

const ensureTurnState = async (user: AuthenticatedUser) => {
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
  input: { campaignId?: unknown; campaignDay?: unknown },
) {
  const target = resolutionTarget(input);
  const state = await ensureTurnState(user);
  const now = Date.now();
  const currentDayKey = accountDayKey(new Date(now), state.timeZone);
  const nextBoundary = accountDayBounds(state.timeZone, now).end;
  if (state.godMode)
    return {
      allowed: true,
      ...snapshotFrom(state, now),
      resolutionGrant: grantFor(target, currentDayKey),
    };

  const claimed = await state.db
    .update(accountTurnState)
    .set({
      lastResolvedDayKey: currentDayKey,
      nextTurnAt: nextBoundary,
      updatedAt: now,
    })
    .where(
      and(
        eq(accountTurnState.ownerEmail, state.ownerEmail),
        or(
          lte(accountTurnState.nextTurnAt, now),
          and(
            isNull(accountTurnState.nextTurnAt),
            or(
              isNull(accountTurnState.lastResolvedDayKey),
              ne(accountTurnState.lastResolvedDayKey, currentDayKey),
            ),
          ),
        ),
      ),
    )
    .returning({ ownerEmail: accountTurnState.ownerEmail });
  const allowed = claimed.length > 0;
  if (!allowed)
    return {
      allowed: false,
      ...(await accountTurnSnapshot(user)),
    };
  return {
    allowed: true,
    ...snapshotFrom(
      {
        ...state,
        lastResolvedDayKey: currentDayKey,
        nextTurnAt: nextBoundary,
      },
      now,
    ),
    resolutionGrant: grantFor(target, currentDayKey),
  };
}
