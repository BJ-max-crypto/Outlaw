import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { heldIncome, islandIncome, type IslandCard } from "@/game/mode/match";
import { TUNING } from "@/game/tuning";
import type { EconomyData } from "@/lib/economy/model";
import { rewardById } from "@/lib/shop/rewards";

export type Account = {
  id: string;
  username: string;
  cash: number;
  energy: number;
  employed: boolean;
  businesses: string[];
  vehicles: string[];
  economy?: EconomyData;
  rewardScale?: number;
  rewardUntil?: number;
  stakeCredit?: number;
};

export type SessionState = {
  code: string;
  hostId: string;
  status: "lobby" | "live";
  members: IslandCard[];
};

const store = globalThis as typeof globalThis & {
  __runout?: { accounts: Map<string, Account>; sessions: Map<string, SessionState> };
};
store.__runout ??= { accounts: new Map(), sessions: new Map() };
const accounts = store.__runout.accounts;
const sessions = store.__runout.sessions;

function database(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function code(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 4; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return sessions.has(value) ? code() : value;
}

export function getAccount(id: string): Account | null {
  return accounts.get(id) ?? null;
}

export function listAccounts(): Account[] {
  return [...accounts.values()];
}

export function saveAccount(account: Account): Account {
  const next = {
    ...account,
    username: account.username.slice(0, 16),
    cash: Math.max(0, Math.floor(account.cash)),
    energy: Math.max(0, Math.min(100, Math.floor(account.energy))),
    businesses: account.businesses.filter((item) => typeof item === "string"),
    vehicles: account.vehicles.filter((item) => typeof item === "string"),
  };
  accounts.set(next.id, next);
  const db = database();
  if (db) {
    void db.from("profiles").upsert({
      id: next.id,
      username: next.username,
      display_name: next.username,
      cash: next.cash,
      energy: next.energy,
      employed: next.employed,
      businesses: next.businesses,
      vehicles: next.vehicles,
      economy: next.economy ?? {},
      last_seen: new Date(next.economy?.lastSeen ?? Date.now()).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return next;
}

export async function loadAccount(id: string): Promise<Account | null> {
  const cached = accounts.get(id);
  if (cached) return cached;
  const db = database();
  if (!db) return null;
  const { data } = await db
    .from("profiles")
    .select("username, display_name, cash, energy, employed, businesses, vehicles, economy, last_seen")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const account: Account = {
    id,
    username: String(data.username || data.display_name || ""),
    cash: Number(data.cash) || 0,
    energy: Number(data.energy) || 0,
    employed: Boolean(data.employed),
    businesses: data.businesses ?? [],
    vehicles: data.vehicles ?? [],
    economy: data.economy && typeof data.economy === "object" ? (data.economy as EconomyData) : undefined,
  };
  if (account.economy && data.last_seen) {
    const seen = Date.parse(String(data.last_seen));
    if (Number.isFinite(seen)) account.economy.lastSeen = seen;
  }
  accounts.set(id, account);
  return account;
}

function persistSession(session: SessionState): void {
  sessions.set(session.code, session);
  const db = database();
  if (!db) return;
  void db.from("sessions").upsert({ code: session.code, host_id: session.hostId, status: session.status });
  for (const member of session.members) {
    void db.from("session_members").upsert({
      code: session.code,
      player_id: member.id,
      username: member.username,
      cash: member.cash,
      businesses: member.businesses,
      reinforcements: member.reinforcements,
      boat: member.boat,
      employed: member.employed,
    });
    void db.from("session_holdings").upsert({ code: session.code, island_id: member.id, held_by: member.heldBy });
  }
}

export function createSession(id: string, username: string): SessionState {
  const session: SessionState = {
    code: code(),
    hostId: id,
    status: "lobby",
    members: [blankMember(id, username)],
  };
  persistSession(session);
  return session;
}

export function joinSession(codeValue: string, id: string, username: string): SessionState | null {
  const session = sessions.get(codeValue.toUpperCase());
  if (!session || session.status !== "lobby") return null;
  if (!session.members.some((member) => member.id === id)) {
    if (session.members.length >= 4) return null;
    session.members.push(blankMember(id, username));
  }
  persistSession(session);
  return session;
}

export function startSession(codeValue: string, id: string): SessionState | null {
  const session = sessions.get(codeValue.toUpperCase());
  if (!session || session.hostId !== id) return null;
  session.status = "live";
  persistSession(session);
  return session;
}

export function readSession(codeValue: string): SessionState | null {
  return sessions.get(codeValue.toUpperCase()) ?? null;
}

export function syncMember(
  codeValue: string,
  id: string,
  patch: Partial<Pick<IslandCard, "cash" | "businesses" | "employed">>,
): SessionState | null {
  const session = sessions.get(codeValue.toUpperCase());
  if (!session) return null;
  const member = session.members.find((item) => item.id === id);
  if (!member) return null;
  if (Number.isFinite(patch.cash)) member.cash = Math.max(0, Math.floor(patch.cash as number));
  if (Array.isArray(patch.businesses)) member.businesses = patch.businesses.filter((item) => typeof item === "string");
  if (typeof patch.employed === "boolean") member.employed = patch.employed;
  persistSession(session);
  return session;
}

export function buyBoat(codeValue: string, id: string, cash: number): { session: SessionState } | { error: string } {
  const session = sessions.get(codeValue.toUpperCase());
  if (!session || session.status !== "live") return { error: "Session is not live." };
  const member = session.members.find((item) => item.id === id);
  if (!member) return { error: "You are not in this session." };
  member.cash = Math.max(0, Math.floor(cash));
  if (member.boat) return { session };
  if (member.cash < TUNING.crossingBoatCost) return { error: "NEED CASH" };
  member.cash -= TUNING.crossingBoatCost;
  member.boat = true;
  persistSession(session);
  return { session };
}

export function buyReinforcement(codeValue: string, id: string, cash: number): { session: SessionState } | { error: string } {
  const session = sessions.get(codeValue.toUpperCase());
  if (!session || session.status !== "live") return { error: "Session is not live." };
  const member = session.members.find((item) => item.id === id);
  if (!member) return { error: "You are not in this session." };
  member.cash = Math.max(0, Math.floor(cash));
  if (member.cash < TUNING.reinforcementCost) return { error: "NEED CASH" };
  member.cash -= TUNING.reinforcementCost;
  member.reinforcements += 1;
  persistSession(session);
  return { session };
}

export function buyIsland(
  codeValue: string,
  id: string,
  targetId: string,
  cash: number,
): { session: SessionState } | { error: string } {
  const session = sessions.get(codeValue.toUpperCase());
  if (!session || session.status !== "live") return { error: "Session is not live." };
  const buyer = session.members.find((item) => item.id === id);
  const target = session.members.find((item) => item.id === targetId);
  if (!buyer || !target || buyer.id === target.id) return { error: "That island is not for sale." };
  if (target.heldBy === buyer.id) return { session };
  buyer.cash = Math.max(0, Math.floor(cash));
  if (buyer.cash < TUNING.islandBuyCost) return { error: "NEED CASH" };
  buyer.cash -= TUNING.islandBuyCost;
  target.heldBy = buyer.id;
  persistSession(session);
  return { session };
}

export function leading(session: SessionState, id: string): boolean {
  const others = session.members.filter((member) => member.id !== id);
  if (others.length === 0) return false;
  const mine = session.members.find((member) => member.id === id);
  if (!mine) return false;
  const ownsAll = others.every((member) => member.heldBy === id);
  const richest = session.members.every((member) => member.id === id || mine.cash >= member.cash);
  return ownsAll && richest;
}

export function claimReward(id: string, rewardId: string): { rewardId: string; multiplier: number; ms: number; cash: number } | null {
  const reward = rewardById(rewardId);
  if (!reward) return null;
  const account = getAccount(id);
  if (account) {
    if (reward.multiplier > 1 && reward.ms > 0) {
      account.rewardScale = reward.multiplier;
      account.rewardUntil = Date.now() + reward.ms;
    }
    if (reward.cash > 0) account.stakeCredit = (account.stakeCredit ?? 0) + reward.cash;
  }
  const db = database();
  if (db) {
    void db.from("shop_claims").insert({ player_id: id, reward_id: reward.id });
  }
  return { rewardId: reward.id, multiplier: reward.multiplier, ms: reward.ms, cash: reward.cash };
}

/** Extra cash per minute from islands and reinforcements this player holds in a live session. */
export function heldPayPerMinute(playerId: string): number {
  for (const session of sessions.values()) {
    if (session.status !== "live") continue;
    if (!session.members.some((member) => member.id === playerId)) continue;
    return heldIncome(session.members, playerId) * (60_000 / TUNING.jobIntervalMs);
  }
  return 0;
}

function blankMember(id: string, username: string): IslandCard {
  return {
    id,
    username,
    businesses: [],
    reinforcements: 0,
    heldBy: id,
    cash: TUNING.startingCash,
    boat: false,
    employed: false,
  };
}

export function ownedIncome(session: SessionState, id: string): number {
  return session.members
    .filter((member) => member.id !== id && member.heldBy === id)
    .reduce((sum, member) => sum + islandIncome(member), 0);
}
