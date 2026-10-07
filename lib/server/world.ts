import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { heldIncome, islandIncome, type IslandCard } from "@/game/mode/match";
import { TUNING } from "@/game/tuning";
import type { EconomyData } from "@/lib/economy/model";
import { rewardById, type ShopReward } from "@/lib/shop/rewards";

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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type MemberRow = {
  player_id: string;
  username: string;
  cash: number;
  businesses: string[] | null;
  reinforcements: number;
  boat: boolean;
  employed: boolean;
};

type HoldingRow = { island_id: string; held_by: string };

export function sessionFromRows(
  code: string,
  hostId: string,
  status: string,
  members: MemberRow[],
  holdings: HoldingRow[],
): SessionState | null {
  if (status !== "lobby" && status !== "live") return null;
  if (members.length === 0) return null;
  const held = new Map(holdings.map((row) => [row.island_id, row.held_by]));
  return {
    code,
    hostId,
    status,
    members: members.map((member) => ({
      id: member.player_id,
      username: member.username,
      cash: Number(member.cash) || 0,
      businesses: member.businesses ?? [],
      reinforcements: Number(member.reinforcements) || 0,
      boat: Boolean(member.boat),
      employed: Boolean(member.employed),
      heldBy: held.get(member.player_id) ?? member.player_id,
    })),
  };
}

async function freshCode(): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const db = database();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let value = "";
    for (let i = 0; i < 4; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (sessions.has(value)) continue;
    if (!db) return value;
    const { data } = await db.from("sessions").select("code").eq("code", value).maybeSingle();
    if (!data) return value;
  }
  let value = "";
  for (let i = 0; i < 4; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return value;
}

async function loadSession(codeValue: string): Promise<SessionState | null> {
  const key = codeValue.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(key)) return null;
  const cached = sessions.get(key);
  if (cached) return cached;
  const db = database();
  if (!db) return null;
  const { data: row } = await db.from("sessions").select("host_id, status").eq("code", key).maybeSingle();
  if (!row) return null;
  const { data: members } = await db
    .from("session_members")
    .select("player_id, username, cash, businesses, reinforcements, boat, employed")
    .eq("code", key);
  const { data: holdings } = await db.from("session_holdings").select("island_id, held_by").eq("code", key);
  const session = sessionFromRows(
    key,
    String(row.host_id ?? ""),
    String(row.status ?? ""),
    (members ?? []) as MemberRow[],
    (holdings ?? []) as HoldingRow[],
  );
  if (!session) return null;
  sessions.set(key, session);
  return session;
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

export async function createSession(id: string, username: string): Promise<SessionState> {
  const session: SessionState = {
    code: await freshCode(),
    hostId: id,
    status: "lobby",
    members: [blankMember(id, username)],
  };
  persistSession(session);
  return session;
}

export async function joinSession(codeValue: string, id: string, username: string): Promise<SessionState | null> {
  const session = await loadSession(codeValue);
  if (!session || session.status !== "lobby") return null;
  if (!session.members.some((member) => member.id === id)) {
    if (session.members.length >= 4) return null;
    session.members.push(blankMember(id, username));
  }
  persistSession(session);
  return session;
}

export async function startSession(codeValue: string, id: string): Promise<SessionState | null> {
  const session = await loadSession(codeValue);
  if (!session || session.hostId !== id) return null;
  session.status = "live";
  persistSession(session);
  return session;
}

export async function readSession(codeValue: string): Promise<SessionState | null> {
  return loadSession(codeValue);
}

export async function syncMember(
  codeValue: string,
  id: string,
  patch: Partial<Pick<IslandCard, "cash" | "businesses" | "employed">>,
): Promise<SessionState | null> {
  const session = await loadSession(codeValue);
  if (!session) return null;
  const member = session.members.find((item) => item.id === id);
  if (!member) return null;
  if (Number.isFinite(patch.cash)) member.cash = Math.max(0, Math.floor(patch.cash as number));
  if (Array.isArray(patch.businesses)) member.businesses = patch.businesses.filter((item) => typeof item === "string");
  if (typeof patch.employed === "boolean") member.employed = patch.employed;
  persistSession(session);
  return session;
}

export async function buyBoat(codeValue: string, id: string, cash: number): Promise<{ session: SessionState } | { error: string }> {
  const session = await loadSession(codeValue);
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

export async function buyReinforcement(
  codeValue: string,
  id: string,
  cash: number,
): Promise<{ session: SessionState } | { error: string }> {
  const session = await loadSession(codeValue);
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

export async function buyIsland(
  codeValue: string,
  id: string,
  targetId: string,
  cash: number,
): Promise<{ session: SessionState } | { error: string }> {
  const session = await loadSession(codeValue);
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

export async function claimReward(id: string, rewardId: string): Promise<ShopReward | null> {
  const reward = rewardById(rewardId);
  if (!reward) return null;
  let account = getAccount(id) ?? (await loadAccount(id));
  if (!account && (reward.cash > 0 || reward.earnings > 1)) {
    account = saveAccount({
      id,
      username: "",
      cash: TUNING.startingCash,
      energy: 100,
      employed: false,
      businesses: [],
      vehicles: [],
    });
  }
  if (account) {
    if (reward.earnings > 1 && reward.ms > 0) {
      account.rewardScale = reward.earnings;
      account.rewardUntil = Date.now() + reward.ms;
    }
    if (reward.cash > 0) account.stakeCredit = (account.stakeCredit ?? 0) + reward.cash;
  }
  const db = database();
  if (db) {
    void db.from("shop_claims").insert({ player_id: id, reward_id: reward.id });
  }
  return reward;
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
