import { businessById, BUSINESSES, STOCKS } from "@/game/world/catalog";

export const MAX_BUSINESS_LEVEL = 3;

/** Just bought, then each upgrade, then the fastest. */
const BUSINESS_INTERVAL_MS = [5_000, 2_000, 500] as const;
export const OFFLINE_CAP_MIN = 480;
export const ONLINE_GAP_MS = 30_000;
export const ROBBERY_GRANT = 700;
export const ROBBERY_GAP_MS = 45_000;
export const MIGRATE_CASH_CAP = 250_000;
export const MIGRATE_SHARES_CAP = 2_000;
export const EVENT_MS = 8 * 60 * 1000;

const VOLATILITY: Record<string, number> = {
  isle: 0.045,
  harbor: 0.03,
  neon: 0.07,
  fuel: 0.055,
};

export type EconomyData = {
  levels: Record<string, number>;
  shares: Record<string, number>;
  basis: Record<string, number>;
  items: string[];
  achievements: string[];
  announced: string[];
  stockProfit: number;
  objectivesDone: number;
  day: string;
  objectiveIds: string[];
  progress: Record<string, number>;
  claimed: string[];
  earnedToday: number;
  businessEarnedToday: number;
  boughtStockToday: boolean;
  visitedPort: boolean;
  upgradedToday: boolean;
  claimedEvents: string[];
  lastSeen: number;
  syncedAt: number;
  robberyAt: number;
};

export type Collectible = { id: string; name: string; value: number };

export const COLLECTIBLES: Collectible[] = [
  { id: "coin", name: "GOLDEN COIN", value: 5_000 },
  { id: "trophy", name: "RARE TROPHY", value: 12_000 },
  { id: "limited", name: "LIMITED BADGE", value: 8_000 },
  { id: "diamond", name: "DIAMOND", value: 25_000 },
  { id: "badge", name: "SPECIAL BADGE", value: 4_000 },
];

export type AchievementDef = { id: string; name: string; detail: string; item?: string };

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "cash-10k", name: "FIRST $10,000", detail: "Hold $10,000 cash.", item: "badge" },
  { id: "cash-100k", name: "FIRST $100,000", detail: "Hold $100,000 cash." },
  { id: "millionaire", name: "MILLIONAIRE", detail: "Hold $1,000,000 cash.", item: "diamond" },
  { id: "biz-3", name: "OWN 3 BUSINESSES", detail: "Own three businesses on the island.", item: "limited" },
  { id: "biz-10", name: "OWN 10 BUSINESSES", detail: "Reach 10 business levels across the island." },
  { id: "stocks-50k", name: "STOCK TRADER", detail: "Make $50,000 profit from stocks." },
  { id: "worth-5m", name: "FIVE MILLION", detail: "Reach $5,000,000 net worth." },
  { id: "goals-10", name: "DAILY REGULAR", detail: "Complete 10 daily objectives.", item: "trophy" },
  { id: "bounty", name: "BOUNTY HUNTER", detail: "Collect a bounty on a wanted player." },
  { id: "crew", name: "IN A CREW", detail: "Join or start a crew." },
  { id: "paid-off", name: "PAID IN FULL", detail: "Pay a loan off." },
  { id: "checkered", name: "CHECKERED", detail: "Win a race." },
];

export type ObjectiveTemplate = { id: string; title: string; goal: number; reward: number };

export const OBJECTIVE_POOL: ObjectiveTemplate[] = [
  { id: "earn", title: "Earn $10,000", goal: 10_000, reward: 1_500 },
  { id: "stock", title: "Buy a stock", goal: 1, reward: 250 },
  { id: "port", title: "Visit the port", goal: 1, reward: 200 },
  { id: "biz", title: "Earn business income", goal: 1, reward: 300 },
  { id: "upgrade", title: "Purchase an upgrade", goal: 1, reward: 400 },
  { id: "robbery", title: "Complete a robbery", goal: 1, reward: 500 },
  { id: "race", title: "Finish a race", goal: 1, reward: 700 },
];

export type WorldEvent = { id: string; name: string; detail: string; claimable: boolean };

const EVENTS: WorldEvent[] = [
  { id: "boom", name: "MARKET BOOM", detail: "Stocks jump 12% and keep trading from there.", claimable: false },
  { id: "crash", name: "MARKET CRASH", detail: "Stocks drop 7%. Insured businesses keep their pay.", claimable: false },
  { id: "shipment", name: "PORT SHIPMENT", detail: "Claim a payout at the port.", claimable: true },
  { id: "refund", name: "TAX REFUND", detail: "A cash refund is waiting.", claimable: true },
  { id: "rush", name: "BUSINESS BOOM", detail: "Owned businesses pay double for now.", claimable: false },
  { id: "lucky", name: "LUCKY HOUR", detail: "Objective and event rewards pay double.", claimable: false },
];

export type QuoteState = { id: string; name: string; price: number; history: number[] };

export type EconomyView = {
  cash: number;
  netWorth: number;
  extraWorth: number;
  username: string;
  rank: number;
  levels: Record<string, number>;
  businesses: { id: string; name: string; level: number; incomePerMin: number; upgradeCost: number | null; value: number }[];
  shares: Record<string, number>;
  basis: Record<string, number>;
  portfolio: number;
  invested: number;
  profit: number;
  realized: number;
  returnPct: number;
  items: Collectible[];
  achievements: { id: string; name: string; detail: string; unlocked: boolean }[];
  objectives: { id: string; title: string; progress: number; goal: number; reward: number; claimed: boolean }[];
  objectivesDone: number;
  event: (WorldEvent & { endsIn: number }) | null;
  incomeScale: number;
  quotes: QuoteState[];
  fresh: string[];
};

export function blankEconomy(now = Date.now()): EconomyData {
  const day = dayKey(now);
  return {
    levels: {},
    shares: {},
    basis: {},
    items: [],
    achievements: [],
    announced: [],
    stockProfit: 0,
    objectivesDone: 0,
    day,
    objectiveIds: objectiveIdsForDay(day),
    progress: {},
    claimed: [],
    earnedToday: 0,
    businessEarnedToday: 0,
    boughtStockToday: false,
    visitedPort: false,
    upgradedToday: false,
    claimedEvents: [],
    lastSeen: now,
    syncedAt: 0,
    robberyAt: 0,
  };
}

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function levelMultiplier(level: number): number {
  const safe = Math.min(MAX_BUSINESS_LEVEL, Math.max(1, Math.floor(level)));
  return 2 ** (safe - 1);
}

/** How long between paychecks. Level 1 is every 5 seconds. The last upgrade is every half second. */
export function businessInterval(level: number): number {
  const index = Math.min(BUSINESS_INTERVAL_MS.length, Math.max(1, Math.floor(level))) - 1;
  return BUSINESS_INTERVAL_MS[index];
}

export function formatRate(ms: number): string {
  const seconds = ms / 1000;
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds}s`;
}

/** Dollars paid each time the business timer fires. Upgrades change how often, not this amount. */
export function businessTick(id: string, _level: number, scale = 1): number {
  const base = businessById(id)?.income ?? 0;
  return Math.round(base * scale);
}

export function businessPerMinute(id: string, level: number, scale = 1): number {
  const ticks = 60_000 / businessInterval(level);
  return Math.round(businessTick(id, level, scale) * ticks);
}

export function upgradeCost(id: string, level: number): number | null {
  if (level >= MAX_BUSINESS_LEVEL) return null;
  const price = businessById(id)?.price ?? 0;
  return price * Math.max(1, level);
}

export function businessValue(id: string, level: number): number {
  const price = businessById(id)?.price ?? 0;
  return price * levelMultiplier(level);
}

export function itemById(id: string): Collectible | undefined {
  return COLLECTIBLES.find((item) => item.id === id);
}

export function stockVolatility(id: string): number {
  return VOLATILITY[id] ?? 0.04;
}

const QUOTE_TICK_MS = 8_000;
const QUOTE_HISTORY = 36;

function quoteSalt(id: string): number {
  let n = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    n ^= id.charCodeAt(i);
    n = Math.imul(n, 16777619);
  }
  return n >>> 0;
}

/** Stable 0–1 value for one stock at one clock tick. */
function quoteUnit(tick: number, id: string): number {
  let x = (Math.imul(tick, 100003) + quoteSalt(id)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

/** One-time news move at the first tick of a boom or crash. Later ticks keep trading from that price. */
function eventShock(tick: number): number {
  if (tick <= 0) return 1;
  const now = tick * QUOTE_TICK_MS;
  const id = currentEvent(now).id;
  const before = currentEvent(now - QUOTE_TICK_MS).id;
  if (id === before) return 1;
  if (id === "boom") return 1.12;
  if (id === "crash") return 0.93;
  return 1;
}

/** Next price in a shared random walk. It pulls back toward the listed price so a day of ticks cannot run away. */
function stepQuote(id: string, listed: number, tick: number, price: number): number {
  const vol = stockVolatility(id) / 0.045;
  const shock = (quoteUnit(tick, id) - 0.5) * 2 * 0.02 * vol;
  const pull = 0.08 * ((listed - price) / listed);
  const next = price * (1 + pull + shock) * eventShock(tick);
  return Math.min(listed * 2.4, Math.max(listed * 0.4, next));
}

type QuoteWalk = { dayTick: number; tick: number; series: Record<string, number[]> };

let quoteWalk: QuoteWalk | null = null;

function dayOpenTick(now: number): number {
  const date = new Date(now);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor(start / QUOTE_TICK_MS);
}

function remember(points: number[], price: number): void {
  points.push(price);
  if (points.length > QUOTE_HISTORY) points.shift();
}

/** Today's path for every stock. Same clock, same prices, no matter who is online. */
function quoteBook(now: number): QuoteWalk {
  const tick = Math.floor(now / QUOTE_TICK_MS);
  const dayTick = dayOpenTick(now);
  if (!quoteWalk || quoteWalk.dayTick !== dayTick || tick < quoteWalk.tick) {
    const series: Record<string, number[]> = {};
    for (const stock of STOCKS) {
      let price = stock.price;
      const points = [price];
      for (let cursor = dayTick + 1; cursor <= tick; cursor += 1) {
        price = stepQuote(stock.id, stock.price, cursor, price);
        remember(points, price);
      }
      series[stock.id] = points;
    }
    quoteWalk = { dayTick, tick, series };
    return quoteWalk;
  }
  if (quoteWalk.tick < tick) {
    for (const stock of STOCKS) {
      const points = quoteWalk.series[stock.id];
      let price = points[points.length - 1] ?? stock.price;
      for (let cursor = quoteWalk.tick + 1; cursor <= tick; cursor += 1) {
        price = stepQuote(stock.id, stock.price, cursor, price);
        remember(points, price);
      }
    }
    quoteWalk.tick = tick;
  }
  return quoteWalk;
}

/**
 * Share prices follow the previous trade. A tick moves the price a little,
 * and a boom or crash is a single jump that stays in the chart.
 */
export function marketQuotes(now = Date.now()): QuoteState[] {
  const book = quoteBook(now);
  return STOCKS.map((stock) => {
    const history = (book.series[stock.id] ?? [stock.price]).map((price) => Math.round(price * 100) / 100);
    return { id: stock.id, name: stock.name, price: history[history.length - 1] ?? stock.price, history };
  });
}

export function currentEvent(now: number): WorldEvent & { endsIn: number } {
  const index = Math.floor(now / EVENT_MS) % EVENTS.length;
  const event = EVENTS[index];
  return { ...event, endsIn: EVENT_MS - (now % EVENT_MS) };
}

export function incomeScaleFor(now: number, insured = false): number {
  const id = currentEvent(now).id;
  if (id === "rush") return 2;
  if (id === "crash" && !insured) return 0.5;
  return 1;
}

/** The traded price is the walked price. News shocks are already in that path. */
export function tradedQuotes(now = Date.now()): QuoteState[] {
  return marketQuotes(now);
}

export function rewardScaleFor(now: number): number {
  return currentEvent(now).id === "lucky" ? 2 : 1;
}

export function objectiveIdsForDay(day: string): string[] {
  const start = [...day].reduce((sum, char) => sum + char.charCodeAt(0), 0) % OBJECTIVE_POOL.length;
  return [0, 1, 2, 3].map((offset) => OBJECTIVE_POOL[(start + offset) % OBJECTIVE_POOL.length].id);
}

export function portfolioValue(shares: Record<string, number>, prices: Record<string, number>): number {
  return Object.entries(shares).reduce((sum, [id, count]) => sum + count * (prices[id] ?? 0), 0);
}

export function investedCapital(basis: Record<string, number>): number {
  return Object.values(basis).reduce((sum, value) => sum + value, 0);
}

export function netWorth(input: {
  cash: number;
  levels: Record<string, number>;
  shares: Record<string, number>;
  prices: Record<string, number>;
  items: string[];
}): number {
  const businesses = Object.entries(input.levels).reduce((sum, [id, level]) => sum + businessValue(id, level), 0);
  const stocks = portfolioValue(input.shares, input.prices);
  const items = input.items.reduce((sum, id) => sum + (itemById(id)?.value ?? 0), 0);
  return input.cash + businesses + stocks + items;
}

export function knownBusiness(id: string): boolean {
  return BUSINESSES.some((business) => business.id === id);
}

export function knownStock(id: string): boolean {
  return STOCKS.some((stock) => stock.id === id);
}

export function qualifyingAchievements(input: {
  cash: number;
  worth: number;
  levels: Record<string, number>;
  stockProfit: number;
  objectivesDone: number;
}): string[] {
  const owned = Object.keys(input.levels).length;
  const levels = Object.values(input.levels).reduce((sum, level) => sum + level, 0);
  const unlocked = new Set<string>();
  if (input.cash >= 10_000) unlocked.add("cash-10k");
  if (input.cash >= 100_000) unlocked.add("cash-100k");
  if (input.cash >= 1_000_000) unlocked.add("millionaire");
  if (owned >= 3) unlocked.add("biz-3");
  if (levels >= 10) unlocked.add("biz-10");
  if (input.stockProfit >= 50_000) unlocked.add("stocks-50k");
  if (input.worth >= 5_000_000) unlocked.add("worth-5m");
  if (input.objectivesDone >= 10) unlocked.add("goals-10");
  return [...unlocked];
}
