import { and, eq, isNull, ne, or } from "drizzle-orm";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import {
  accountDayBounds,
  accountDayKey,
  validTimeZone,
} from "../app/account-time";
import { ensureAccount } from "./accounts";
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

const ensureTurnState = async (user: ChatGPTUser) => {
  const db = await getDb();
  const ownerEmail = await ensureAccount(user);
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
  };
};

const snapshotFrom = (
  state: Awaited<ReturnType<typeof ensureTurnState>>,
  now = Date.now(),
): AccountTurnSnapshot => {
  const dayKey = accountDayKey(new Date(now), state.timeZone);
  return {
    godMode: state.godMode,
    dayKey,
    lastResolvedDayKey: state.lastResolvedDayKey,
    canResolve:
      state.godMode || state.lastResolvedDayKey !== dayKey,
    nextTurnAt: accountDayBounds(state.timeZone, now).end,
    timeZone: state.timeZone,
  };
};

export async function accountTurnSnapshot(user: ChatGPTUser) {
  return snapshotFrom(await ensureTurnState(user));
}

export async function setGodMode(user: ChatGPTUser, enabled: boolean) {
  const state = await ensureTurnState(user);
  const now = Date.now();
  const currentDayKey = accountDayKey(new Date(now), state.timeZone);
  await state.db
    .update(accountTurnState)
    .set({
      godMode: enabled,
      lastResolvedDayKey: enabled
        ? state.lastResolvedDayKey
        : currentDayKey,
      updatedAt: now,
    })
    .where(eq(accountTurnState.ownerEmail, state.ownerEmail));
  return snapshotFrom(
    {
      ...state,
      godMode: enabled,
      lastResolvedDayKey: enabled
        ? state.lastResolvedDayKey
        : currentDayKey,
    },
    now,
  );
}

export async function claimDailyResolution(user: ChatGPTUser) {
  const state = await ensureTurnState(user);
  const now = Date.now();
  const currentDayKey = accountDayKey(new Date(now), state.timeZone);
  if (state.godMode)
    return {
      allowed: true,
      ...snapshotFrom(state, now),
    };

  const claimed = await state.db
    .update(accountTurnState)
    .set({
      lastResolvedDayKey: currentDayKey,
      updatedAt: now,
    })
    .where(
      and(
        eq(accountTurnState.ownerEmail, state.ownerEmail),
        or(
          isNull(accountTurnState.lastResolvedDayKey),
          ne(accountTurnState.lastResolvedDayKey, currentDayKey),
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
      },
      now,
    ),
  };
}
