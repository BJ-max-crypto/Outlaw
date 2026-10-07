import { STOCKS, businessById } from "@/game/world/catalog";
import { TUNING } from "@/game/tuning";
import {
  ACHIEVEMENTS,
  OBJECTIVE_POOL,
  blankEconomy,
  businessPerMinute,
  businessValue,
  currentEvent,
  dayKey,
  incomeScaleFor,
  investedCapital,
  itemById,
  knownBusiness,
  knownStock,
  MIGRATE_CASH_CAP,
  MIGRATE_SHARES_CAP,
  netWorth,
  objectiveIdsForDay,
  OFFLINE_CAP_MIN,
  ONLINE_GAP_MS,
  portfolioValue,
  qualifyingAchievements,
  rewardScaleFor,
  ROBBERY_GAP_MS,
  ROBBERY_GRANT,
  marketQuotes,
  upgradeCost,
  type EconomyData,
  type EconomyView,
  type QuoteState,
} from "@/lib/economy/model";
import { getAccount, heldPayPerMinute, listAccounts, loadAccount, saveAccount, type Account } from "@/lib/server/world";

type Report = {
  cash?: number;
  energy?: number;
  employed?: boolean;
  onShift?: boolean;
  vehicles?: string[];
  businesses?: string[];
  levels?: Record<string, number>;
  shares?: Record<string, number>;
  basis?: Record<string, number>;
  items?: string[];
  stockProfit?: number;
  objectivesDone?: number;
  username?: string;
};

const quotes: QuoteState[] = STOCKS.map((stock) => ({
  id: stock.id,
  name: stock.name,
  price: stock.price,
  history: [stock.price],
}));

function prices(): Record<string, number> {
  return Object.fromEntries(quotes.map((quote) => [quote.id, quote.price]));
}

/** Copy the clock-based quotes into the trade book. Same prices for every player. */
export function stepMarket(now = Date.now()): QuoteState[] {
  const next = marketQuotes(now);
  for (const quote of quotes) {
    const row = next.find((item) => item.id === quote.id);
    if (!row) continue;
    quote.price = row.price;
    quote.history = row.history.slice();
  }
  return quotes.map((quote) => ({ ...quote, history: quote.history.slice() }));
}

function economyOf(account: Account, now: number): EconomyData {
  if (!account.economy) account.economy = blankEconomy(now);
  return account.economy;
}

function rollDay(data: EconomyData, now: number): void {
  const day = dayKey(now);
  if (data.day === day) return;
  data.day = day;
  data.objectiveIds = objectiveIdsForDay(day);
  data.progress = {};
  data.claimed = [];
  data.earnedToday = 0;
  data.businessEarnedToday = 0;
  data.boughtStockToday = false;
  data.visitedPort = false;
  data.upgradedToday = false;
}

function businessMinutes(data: EconomyData, scale: number): number {
  return Object.entries(data.levels).reduce((sum, [id, level]) => sum + businessPerMinute(id, level, scale), 0);
}

function applyOffline(account: Account, now: number): void {
  const data = economyOf(account, now);
  rollDay(data, now);
  const gap = now - data.lastSeen;
  if (gap > ONLINE_GAP_MS && Object.keys(data.levels).length > 0) {
    const minutes = Math.min(OFFLINE_CAP_MIN, gap / 60_000);
    const pay = Math.floor(businessMinutes(data, incomeScaleFor(now)) * minutes);
    if (pay > 0) {
      account.cash += pay;
      data.earnedToday += pay;
      data.businessEarnedToday += pay;
    }
  }
  data.lastSeen = now;
}

function refreshAchievements(account: Account, now: number): string[] {
  const data = economyOf(account, now);
  const worth = netWorth({
    cash: account.cash,
    levels: data.levels,
    shares: data.shares,
    prices: prices(),
    items: data.items,
  });
  const unlocked = qualifyingAchievements({
    cash: account.cash,
    worth,
    levels: data.levels,
    stockProfit: data.stockProfit,
    objectivesDone: data.objectivesDone,
  });
  const fresh = unlocked.filter((id) => !data.achievements.includes(id));
  for (const id of fresh) {
    data.achievements.push(id);
    const item = ACHIEVEMENTS.find((entry) => entry.id === id)?.item;
    if (item && !data.items.includes(item)) data.items.push(item);
  }
  return fresh.filter((id) => !data.announced.includes(id));
}

function markAnnounced(account: Account, fresh: string[]): void {
  const data = account.economy;
  if (!data) return;
  for (const id of fresh) {
    if (!data.announced.includes(id)) data.announced.push(id);
  }
}

function toView(account: Account, now: number, fresh: string[]): EconomyView {
  const data = economyOf(account, now);
  const scale = incomeScaleFor(now);
  const priceBook = prices();
  const portfolio = portfolioValue(data.shares, priceBook);
  const invested = investedCapital(data.basis);
  const profit = portfolio - invested;
  const worth = netWorth({
    cash: account.cash,
    levels: data.levels,
    shares: data.shares,
    prices: priceBook,
    items: data.items,
  });
  const event = currentEvent(now);
  return {
    cash: account.cash,
    netWorth: worth,
    username: account.username,
    rank: rankOf(account.id),
    levels: { ...data.levels },
    businesses: Object.entries(data.levels).map(([id, level]) => ({
      id,
      name: businessById(id)?.name ?? id,
      level,
      incomePerMin: businessPerMinute(id, level, scale),
      upgradeCost: upgradeCost(id, level),
      value: businessValue(id, level),
    })),
    shares: { ...data.shares },
    basis: { ...data.basis },
    portfolio,
    invested,
    profit,
    realized: data.stockProfit,
    returnPct: invested > 0 ? Math.round((profit / invested) * 1000) / 10 : 0,
    items: data.items.map((id) => itemById(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)),
    achievements: ACHIEVEMENTS.map((entry) => ({
      id: entry.id,
      name: entry.name,
      detail: entry.detail,
      unlocked: data.achievements.includes(entry.id),
    })),
    objectives: data.objectiveIds.map((id) => {
      const template = OBJECTIVE_POOL.find((entry) => entry.id === id)!;
      return {
        id,
        title: template.title,
        progress: Math.min(template.goal, progressOf(data, id)),
        goal: template.goal,
        reward: template.reward * rewardScaleFor(now),
        claimed: data.claimed.includes(id),
      };
    }),
    objectivesDone: data.objectivesDone,
    event: { ...event, claimable: event.claimable && !data.claimedEvents.includes(eventKey(event.id, now)) },
    incomeScale: scale,
    quotes: quotes.map((quote) => ({ ...quote, history: quote.history.slice() })),
    fresh: fresh.map((id) => ACHIEVEMENTS.find((entry) => entry.id === id)?.name ?? id),
  };
}

export function present(account: Account, now = Date.now()): EconomyView {
  applyOffline(account, now);
  stepMarket(now);
  const fresh = refreshAchievements(account, now);
  markAnnounced(account, fresh);
  saveAccount(account);
  return toView(account, now, fresh);
}

function progressOf(data: EconomyData, id: string): number {
  if (id === "earn") return data.earnedToday;
  if (id === "stock") return data.boughtStockToday ? 1 : 0;
  if (id === "port") return data.visitedPort ? 1 : 0;
  if (id === "biz") return data.businessEarnedToday;
  if (id === "upgrade") return data.upgradedToday ? 1 : 0;
  return data.progress[id] ?? 0;
}

function eventKey(id: string, now: number): string {
  return `${id}:${Math.floor(now / (8 * 60 * 1000))}`;
}

function migrate(account: Account, report: Report, now: number): void {
  const data = economyOf(account, now);
  if (data.syncedAt) return;
  const reported = Number(report.cash);
  account.cash = Math.max(0, Math.min(MIGRATE_CASH_CAP, Number.isFinite(reported) ? Math.floor(reported) : account.cash));
  const levels = report.levels ?? {};
  const businesses = Array.isArray(report.businesses) ? report.businesses : [];
  for (const id of businesses) {
    if (knownBusiness(id) && !data.levels[id]) data.levels[id] = 1;
  }
  for (const [id, level] of Object.entries(levels)) {
    if (!knownBusiness(id)) continue;
    data.levels[id] = Math.min(3, Math.max(1, Math.floor(level)));
  }
  const shares = report.shares ?? {};
  const basis = report.basis ?? {};
  for (const [id, count] of Object.entries(shares)) {
    if (!knownStock(id)) continue;
    data.shares[id] = Math.min(MIGRATE_SHARES_CAP, Math.max(0, Math.floor(count)));
    data.basis[id] = Math.max(0, Math.floor(basis[id] ?? 0));
  }
  for (const id of report.items ?? []) {
    if (itemById(id) && !data.items.includes(id)) data.items.push(id);
  }
  data.stockProfit = Math.max(0, Math.min(5_000_000, Math.floor(report.stockProfit ?? 0)));
  data.objectivesDone = Math.max(0, Math.min(10_000, Math.floor(report.objectivesDone ?? 0)));
  account.businesses = Object.keys(data.levels);
  data.syncedAt = now;
}

export function syncReported(account: Account, report: Report, now = Date.now()): void {
  const data = economyOf(account, now);
  rollDay(data, now);
  if (typeof report.username === "string" && report.username.trim().length >= 2) {
    account.username = report.username.trim().slice(0, 16);
  }
  if (!data.syncedAt) {
    migrate(account, report, now);
    data.lastSeen = now;
    return;
  }
  const reported = Number(report.cash);
  const gap = Math.max(0, now - data.syncedAt);
  if (Number.isFinite(reported)) {
    const next = Math.max(0, Math.floor(reported));
    if (gap >= ONLINE_GAP_MS) {
      applyOffline(account, now);
    } else if (next < account.cash) {
      account.cash = next;
    } else {
      const minutes = gap / 60_000;
      const scale = account.rewardUntil && account.rewardUntil > now ? Math.min(2, account.rewardScale ?? 1) : 1;
      const job = report.onShift && account.employed ? TUNING.jobPay * 15 * minutes * scale : 0;
      const business = businessMinutes(data, incomeScaleFor(now)) * minutes * scale;
      const island = heldPayPerMinute(account.id) * minutes * scale;
      const robbery = now - data.robberyAt >= ROBBERY_GAP_MS ? ROBBERY_GRANT : 0;
      const stake = account.stakeCredit ?? 0;
      const allowed = account.cash + Math.ceil(job + business + island + robbery + stake);
      if (next > account.cash + Math.ceil(job + business + island) && robbery > 0) data.robberyAt = now;
      if (stake > 0 && next >= account.cash + stake) account.stakeCredit = 0;
      const gained = Math.max(0, Math.min(next, allowed) - account.cash);
      account.cash += gained;
      data.earnedToday += gained;
      data.businessEarnedToday += Math.min(gained, Math.ceil(business));
    }
  }
  if (Number.isFinite(report.energy)) account.energy = Math.max(0, Math.min(100, Math.floor(report.energy as number)));
  if (typeof report.employed === "boolean") account.employed = report.employed;
  if (Array.isArray(report.vehicles)) account.vehicles = report.vehicles.filter((id) => typeof id === "string").slice(0, 24);
  account.businesses = Object.keys(data.levels);
  data.syncedAt = now;
  data.lastSeen = now;
}

async function accountFor(id: string, username = ""): Promise<Account> {
  const existing = getAccount(id) ?? (await loadAccount(id));
  if (existing) return existing;
  return saveAccount({
    id,
    username,
    cash: TUNING.startingCash,
    energy: 100,
    employed: false,
    businesses: [],
    vehicles: [],
    economy: blankEconomy(),
  });
}

export async function readEconomy(id: string, username = ""): Promise<EconomyView> {
  const account = await accountFor(id, username);
  return present(account);
}

export async function postEconomy(
  id: string,
  body: Report & {
    action?: string;
    businessId?: string;
    stockId?: string;
    quantity?: number;
    side?: "buy" | "sell";
    eventId?: string;
  },
): Promise<{ view: EconomyView; error?: string }> {
  const account = await accountFor(id, body.username ?? "");
  const now = Date.now();
  stepMarket(now);
  syncReported(account, body, now);
  const action = body.action ?? "sync";
  const fail = (message: string) => ({ error: message, view: present(account, now) });
  if (action === "buy-business") {
    const businessId = body.businessId ?? "";
    const price = businessById(businessId)?.price ?? 0;
    const data = economyOf(account, now);
    if (!knownBusiness(businessId)) return fail("Unknown business.");
    if (!data.levels[businessId]) {
      if (account.cash < price) return fail("NEED CASH");
      account.cash -= price;
      data.levels[businessId] = 1;
    }
  } else if (action === "upgrade") {
    const businessId = body.businessId ?? "";
    const data = economyOf(account, now);
    const level = data.levels[businessId] ?? 0;
    const cost = upgradeCost(businessId, level);
    if (!level || cost === null) return fail("That business cannot be upgraded.");
    if (account.cash < cost) return fail("NEED CASH");
    account.cash -= cost;
    data.levels[businessId] = level + 1;
    data.upgradedToday = true;
  } else if (action === "trade") {
    const stockId = body.stockId ?? "";
    const quantity = Math.min(9999, Math.max(1, Math.floor(body.quantity ?? 1)));
    const quote = quotes.find((entry) => entry.id === stockId);
    if (!quote || !knownStock(stockId)) return fail("Unknown stock.");
    const data = economyOf(account, now);
    const owned = data.shares[stockId] ?? 0;
    if ((body.side ?? "buy") === "buy") {
      const cost = quote.price * quantity;
      if (account.cash < cost) return fail("NEED CASH");
      account.cash -= cost;
      data.shares[stockId] = owned + quantity;
      data.basis[stockId] = (data.basis[stockId] ?? 0) + cost;
      data.boughtStockToday = true;
    } else {
      const sold = Math.min(owned, quantity);
      if (sold <= 0) return fail("NO SHARES");
      const basis = data.basis[stockId] ?? 0;
      const average = owned > 0 ? basis / owned : 0;
      const proceeds = quote.price * sold;
      data.stockProfit += proceeds - average * sold;
      data.shares[stockId] = owned - sold;
      data.basis[stockId] = Math.max(0, basis - average * sold);
      if (data.shares[stockId] <= 0) {
        delete data.shares[stockId];
        delete data.basis[stockId];
      }
      account.cash += proceeds;
    }
  } else if (action === "visit") {
    economyOf(account, now).visitedPort = true;
  } else if (action === "claim-objective") {
    const objectiveId = body.businessId ?? "";
    const data = economyOf(account, now);
    const template = OBJECTIVE_POOL.find((entry) => entry.id === objectiveId);
    if (!template || !data.objectiveIds.includes(objectiveId)) return fail("That objective is not active.");
    if (data.claimed.includes(objectiveId)) return fail("Already claimed.");
    if (progressOf(data, objectiveId) < template.goal) return fail("NOT YET");
    account.cash += template.reward * rewardScaleFor(now);
    data.claimed.push(objectiveId);
    data.objectivesDone += 1;
  } else if (action === "claim-event") {
    const event = currentEvent(now);
    const key = eventKey(event.id, now);
    const data = economyOf(account, now);
    if (!event.claimable || body.eventId !== event.id) return fail("Nothing to claim.");
    if (data.claimedEvents.includes(key)) return fail("Already claimed.");
    const scale = rewardScaleFor(now);
    if (event.id === "refund") account.cash += 400 * scale;
    if (event.id === "shipment") {
      account.cash += 250 * scale;
      if (Math.random() < 0.15 && !data.items.includes("coin")) data.items.push("coin");
    }
    data.claimedEvents.push(key);
    data.earnedToday += event.id === "refund" ? 400 * scale : 250 * scale;
  }
  account.businesses = Object.keys(economyOf(account, now).levels);
  return { view: present(account, now) };
}

function rankOf(id: string): number {
  const rows = listAccounts()
    .map((account) => ({ id: account.id, worth: worthOf(account) }))
    .sort((a, b) => b.worth - a.worth);
  const index = rows.findIndex((row) => row.id === id);
  return index < 0 ? rows.length + 1 : index + 1;
}

function worthOf(account: Account): number {
  const data = account.economy ?? blankEconomy();
  return netWorth({
    cash: account.cash,
    levels: data.levels,
    shares: data.shares,
    prices: prices(),
    items: data.items,
  });
}

export type BoardId = "netWorth" | "cash" | "businesses" | "stocks" | "achievements";

function scored(board: BoardId): { id: string; username: string; value: number }[] {
  const rows = listAccounts().map((account) => {
    const data = account.economy ?? blankEconomy();
    const invested = investedCapital(data.basis);
    const profit = portfolioValue(data.shares, prices()) - invested;
    const value =
      board === "cash"
        ? account.cash
        : board === "businesses"
          ? Object.keys(data.levels).length
          : board === "stocks"
            ? invested > 0
              ? Math.round((profit / invested) * 1000) / 10
              : 0
            : board === "achievements"
              ? data.achievements.length
              : worthOf(account);
    return { id: account.id, username: account.username || "PLAYER", value };
  });
  return rows.sort((a, b) => b.value - a.value);
}

export function leaderboard(board: BoardId): { id: string; username: string; value: number }[] {
  return scored(board).slice(0, 10);
}

export function boardRank(board: BoardId, id: string): number | null {
  const index = scored(board).findIndex((row) => row.id === id);
  return index < 0 ? null : index + 1;
}

export async function publicCard(id: string): Promise<EconomyView | null> {
  const account = getAccount(id) ?? (await loadAccount(id));
  if (!account) return null;
  return toView(account, Date.now(), []);
}
