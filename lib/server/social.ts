import { businessById } from "@/game/world/catalog";
import { dayKey, itemById, type EconomyData } from "@/lib/economy/model";
import {
  AUCTION_LOTS,
  BLACK_MARKET,
  CONTRACTS,
  GARAGE,
  HOME_THEMES,
  INSURE_BUSINESS_DAY,
  INSURE_VEHICLE_DAY,
  LOAN_CAP,
  LOAN_RATE,
  LOAN_TERM_MS,
  RACE_ENTRY,
  RACE_LEG_MS,
  RACE_PAR_MS,
  DROP_SPOTS,
  RACE_POINTS,
  RACE_SECOND,
  RACE_WIN,
  garageById,
  insideSite,
  robSite,
  type SocialView,
} from "@/lib/sandbox/catalog";
import { getAccount, listAccounts, type Account } from "@/lib/server/world";

export type PlayerSandbox = {
  wanted: number;
  wantedAt: number;
  x: number;
  y: number;
  seenAt: number;
  garage: string[];
  spawned: string;
  stolen: string[];
  loan: { principal: number; balance: number; due: number } | null;
  loanPaid: boolean;
  insureVehicles: boolean;
  insureBusiness: boolean;
  insureDay: string;
  claimDay: string;
  safe: number;
  theme: string;
  crewId: string;
  loanSkimAt: number;
  jobId: string;
  jobAt: number;
  bountyClaims: number;
  bountyClaimAt: Record<string, number>;
  raceWins: number;
  toast: string;
};

type Bounty = { reward: number; stars: number; at: number; username: string };
type Crew = {
  code: string;
  name: string;
  leader: string;
  treasury: number;
  pot: Record<string, number>;
  shop: string;
  shopFund: number;
  lastPay: number;
  members: string[];
};
type Auction = { index: number; ends: number; bids: { id: string; name: string; amount: number }[] };
type Race = {
  id: string;
  mode: "clock" | "pvp";
  entry: number;
  by: string;
  status: "open" | "live" | "done";
  started: number;
  ends: number;
  pot: number;
  step: Record<string, { index: number; at: number }>;
  winner: string;
};
type Job = { id: string; kind: string; by: string; reward: number; taker: string; at: number };

const social = globalThis as typeof globalThis & {
  __runoutSocial?: {
    bounties: Map<string, Bounty>;
    crews: Map<string, Crew>;
    auction: Auction | null;
    races: Map<string, Race>;
    jobs: Job[];
    drops: Set<string>;
    claimedJobs: Set<string>;
    seq: number;
  };
};
social.__runoutSocial ??= {
  bounties: new Map(),
  crews: new Map(),
  auction: null,
  races: new Map(),
  jobs: [],
  drops: new Set(),
  claimedJobs: new Set(),
  seq: 1,
};
const world = social.__runoutSocial;
world.claimedJobs ??= new Set();

export function ensureSandbox(account: Account): PlayerSandbox {
  const economy = (account.economy ??= {} as EconomyData);
  const current = (economy as EconomyData & { sandbox?: PlayerSandbox }).sandbox;
  if (current && Array.isArray(current.garage)) return current;
  const fresh: PlayerSandbox = {
    wanted: 0,
    wantedAt: 0,
    x: 0,
    y: 0,
    seenAt: 0,
    garage: [],
    spawned: "",
    stolen: [],
    loan: null,
    loanPaid: false,
    insureVehicles: false,
    insureBusiness: false,
    insureDay: "",
    claimDay: "",
    safe: 0,
    theme: "slate",
    crewId: "",
    loanSkimAt: 0,
    jobId: "",
    jobAt: 0,
    bountyClaims: 0,
    bountyClaimAt: {},
    raceWins: 0,
    toast: "",
  };
  (economy as EconomyData & { sandbox?: PlayerSandbox }).sandbox = fresh;
  return fresh;
}

export function businessInsured(account: Account): boolean {
  return ensureSandbox(account).insureBusiness;
}

function note(box: PlayerSandbox, text: string): void {
  box.toast = text;
}

function code(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 4; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return world.crews.has(value) ? code() : value;
}

function flash(now: number): { name: string; detail: string; endsIn: number; business: number; vehicle: number } | null {
  const cycle = 30 * 60 * 1000;
  const window = 5 * 60 * 1000;
  const into = now % cycle;
  if (into >= window) return null;
  const sale = Math.floor(now / cycle) % 2 === 0;
  return sale
    ? { name: "BUSINESS SALE", detail: "All businesses are 30% off.", endsIn: window - into, business: 0.7, vehicle: 1 }
    : { name: "VEHICLE SALE", detail: "Garage cars are 25% off.", endsIn: window - into, business: 1, vehicle: 0.75 };
}

export function businessPrice(id: string, now: number): number {
  const price = businessById(id)?.price ?? 0;
  return Math.ceil(price * (flash(now)?.business ?? 1));
}

export function vehiclePrice(id: string, now: number): number {
  const price = garageById(id)?.price ?? 0;
  return Math.ceil(price * (flash(now)?.vehicle ?? 1));
}

function dropKey(now: number): string {
  return String(Math.floor(now / 180_000));
}

function dropPoint(now: number): { x: number; y: number } {
  const spot = DROP_SPOTS[Math.floor(now / 180_000) % DROP_SPOTS.length];
  return { x: spot.x * 2, y: spot.y * 2 };
}

function near(ax: number, ay: number, bx: number, by: number, limit: number): boolean {
  return Math.hypot(ax - bx, ay - by) <= limit;
}

function tickAuction(now: number): void {
  const slot = Math.floor(now / (4 * 60 * 1000));
  const ends = (slot + 1) * 4 * 60 * 1000;
  if (!world.auction || world.auction.index !== slot) {
    if (world.auction) awardAuction(world.auction);
    world.auction = { index: slot, ends, bids: [] };
  } else if (now >= world.auction.ends) {
    awardAuction(world.auction);
    world.auction = { index: slot, ends, bids: [] };
  }
}

function awardAuction(auction: Auction): void {
  const winner = [...auction.bids].sort((a, b) => b.amount - a.amount)[0];
  if (!winner) return;
  const account = getAccount(winner.id);
  if (!account) return;
  const lot = AUCTION_LOTS[auction.index % AUCTION_LOTS.length];
  const box = ensureSandbox(account);
  if (lot.kind === "car" && !box.garage.includes(lot.id)) box.garage.push(lot.id);
  if (lot.kind === "item") {
    const data = account.economy;
    if (data && !data.items.includes(lot.id)) data.items.push(lot.id);
  }
  note(box, `WON ${lot.name}`);
}

function tickCrewPay(account: Account, now: number): void {
  const box = ensureSandbox(account);
  if (!box.crewId) return;
  const crew = world.crews.get(box.crewId);
  if (!crew || !crew.shop || crew.shopFund <= 0) return;
  const business = businessById(crew.shop);
  if (!business) return;
  if (crew.lastPay <= 0) crew.lastPay = now;
  const elapsed = Math.min(120_000, now - crew.lastPay);
  if (elapsed < 4_000) return;
  crew.lastPay = now;
  const perMin = business.income * 15;
  const total = Object.values(crew.pot).reduce((sum, value) => sum + value, 0) || 1;
  const mine = crew.pot[account.id] ?? 0;
  const pay = Math.floor((perMin * (elapsed / 60_000) * mine) / total);
  if (pay > 0) account.cash += pay;
}

function tickInsurance(account: Account, now: number): void {
  const box = ensureSandbox(account);
  const day = dayKey(now);
  if (box.insureDay === day) return;
  box.insureDay = day;
  let bill = 0;
  if (box.insureVehicles) bill += INSURE_VEHICLE_DAY;
  if (box.insureBusiness) bill += INSURE_BUSINESS_DAY;
  if (bill <= 0) return;
  if (account.cash >= bill) account.cash -= bill;
  else {
    box.insureVehicles = false;
    box.insureBusiness = false;
    note(box, "INSURANCE LAPSED");
  }
}

function tickLoan(account: Account, now: number): void {
  const box = ensureSandbox(account);
  if (!box.loan || box.loan.balance <= 0) return;
  if (now <= box.loan.due || account.cash <= 0 || now - box.loanSkimAt < 60_000) return;
  box.loanSkimAt = now;
  const skim = Math.min(box.loan.balance, Math.max(50, Math.floor(account.cash * 0.05)));
  account.cash -= skim;
  box.loan.balance -= skim;
  if (box.loan.balance <= 0) {
    box.loan = null;
    box.loanPaid = true;
    note(box, "LOAN PAID");
  }
}

function tickRaces(now: number): void {
  for (const [id, race] of world.races) {
    if (race.status === "open" && now > race.ends) {
      const host = getAccount(race.by);
      if (host) host.cash += race.entry;
      world.races.delete(id);
    }
    if (race.status === "live" && now > race.ends) {
      if (!race.winner) {
        for (const member of Object.keys(race.step)) {
          const account = getAccount(member);
          if (account) account.cash += race.entry;
        }
      }
      world.races.delete(id);
    }
  }
}

export function tickSocial(account: Account, now: number): void {
  const box = ensureSandbox(account);
  if (box.wanted > 0 && now - box.wantedAt > 90_000) {
    box.wanted = 0;
    world.bounties.delete(account.id);
  }
  tickInsurance(account, now);
  tickLoan(account, now);
  tickCrewPay(account, now);
  tickAuction(now);
  tickRaces(now);
}

function late(account: Account, now: number): boolean {
  const loan = ensureSandbox(account).loan;
  return Boolean(loan && loan.balance > 0 && now > loan.due);
}

function rememberPlace(account: Account, x: unknown, y: unknown, now: number): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const box = ensureSandbox(account);
  box.x = Math.round(Number(x));
  box.y = Math.round(Number(y));
  box.seenAt = now;
}

type Body = {
  action?: string;
  businessId?: string;
  eventId?: string;
  quantity?: number;
  x?: number;
  y?: number;
  side?: string;
};

export function applySocial(account: Account, body: Body, now: number): string | null {
  rememberPlace(account, body.x, body.y, now);
  const action = body.action ?? "";
  if (action === "rob") return rob(account, body, now);
  if (action === "garage-buy") return buyCar(account, body.businessId ?? "", now);
  if (action === "garage-spawn") return spawnCar(account, body.businessId ?? "");
  if (action === "garage-store") return storeCar(account);
  if (action === "garage-sell") return sellCar(account, body.businessId ?? "");
  if (action === "clean-title") return cleanTitle(account, body.businessId ?? "");
  if (action === "stolen") return flagStolen(account, body.businessId ?? "");
  if (action === "loan-take") return takeLoan(account, now);
  if (action === "loan-pay") return payLoan(account, Math.floor(body.quantity ?? 0));
  if (action === "insure") return insure(account, body.businessId ?? "", now);
  if (action === "bid") return bid(account, Math.floor(body.quantity ?? 0), now);
  if (action === "market-buy") return blackBuy(account, body.businessId ?? "", now);
  if (action === "crew-create") return createCrew(account, body.eventId ?? "");
  if (action === "crew-join") return joinCrew(account, (body.eventId ?? "").toUpperCase());
  if (action === "crew-leave") return leaveCrew(account);
  if (action === "crew-pay") return fundCrew(account, Math.floor(body.quantity ?? 0));
  if (action === "crew-fund") return fundShop(account, body.businessId ?? "", Math.floor(body.quantity ?? 0));
  if (action === "job-post") return postJob(account, body.eventId ?? "delivery", Math.floor(body.quantity ?? 0));
  if (action === "job-take") return takeJob(account, body.businessId ?? "", now);
  if (action === "job-finish") return finishJob(account, body.businessId ?? "", Number(body.x), Number(body.y), now);
  if (action === "race-clock") return raceClock(account, now);
  if (action === "race-open") return raceOpen(account, now);
  if (action === "race-join") return raceJoin(account, body.businessId ?? "", now);
  if (action === "race-step") return raceStep(account, Number(body.x), Number(body.y), now);
  if (action === "bounty-claim") return claimBounty(account, body.businessId ?? "", now);
  if (action === "heat-clear") return clearHeat(account, body.eventId ?? "", now);
  if (action === "drop-claim") return claimDrop(account, Number(body.x), Number(body.y), now);
  if (action === "safe") return moveSafe(account, body.side ?? "in", Math.floor(body.quantity ?? 0));
  if (action === "theme") return setTheme(account, body.eventId ?? "");
  return null;
}

function rob(account: Account, body: Body, now: number): string | null {
  const site = robSite(body.businessId ?? "");
  if (!site) return "Unknown spot.";
  if (!insideSite(site, Number(body.x), Number(body.y))) return "You are not inside.";
  const data = account.economy;
  if (!data) return "NOT YET";
  if (now - data.robberyAt < 45_000) return "COME BACK LATER";
  const span = site.max - site.min;
  const roll = Math.floor(Math.abs(Math.sin(now / 1000 + account.id.length)) * (span + 1));
  const payout = site.min + roll;
  const stars = site.wanted;
  const skim = stars >= 2 ? Math.floor(payout * 0.25) : 0;
  account.cash += payout - skim;
  data.robberyAt = now;
  data.earnedToday += payout - skim;
  data.progress.robbery = 1;
  const box = ensureSandbox(account);
  box.wanted = Math.max(box.wanted, stars);
  box.wantedAt = now;
  if (skim > 0) {
    world.bounties.set(account.id, { reward: skim, stars, at: now, username: account.username || "PLAYER" });
  }
  note(box, `+$${payout - skim}`);
  return null;
}

function buyCar(account: Account, id: string, now: number): string | null {
  const car = garageById(id);
  if (!car) return "Unknown vehicle.";
  if (late(account, now)) return "PAY THE LOAN";
  const box = ensureSandbox(account);
  if (box.garage.includes(id)) return "Already owned.";
  const price = vehiclePrice(id, now);
  if (account.cash < price) return "NEED CASH";
  account.cash -= price;
  box.garage.push(id);
  note(box, car.name);
  return null;
}

function spawnCar(account: Account, id: string): string | null {
  const box = ensureSandbox(account);
  if (!box.garage.includes(id) && !box.stolen.includes(id)) return "You do not own that.";
  box.spawned = id;
  return null;
}

function storeCar(account: Account): string | null {
  ensureSandbox(account).spawned = "";
  return null;
}

function sellCar(account: Account, id: string): string | null {
  const box = ensureSandbox(account);
  if (box.stolen.includes(id)) return "STOLEN — CLEAN IT";
  if (!box.garage.includes(id)) return "You do not own that.";
  const car = garageById(id);
  if (!car) return "Unknown vehicle.";
  box.garage = box.garage.filter((item) => item !== id);
  if (box.spawned === id) box.spawned = "";
  account.cash += Math.floor(car.price * 0.6);
  return null;
}

function flagStolen(account: Account, id: string): string | null {
  const box = ensureSandbox(account);
  if (!box.stolen.includes(id)) box.stolen.push(id);
  box.wanted = Math.max(box.wanted, 2);
  box.wantedAt = Date.now();
  return null;
}

function cleanTitle(account: Account, id: string): string | null {
  const box = ensureSandbox(account);
  if (!box.stolen.includes(id)) return "That car is clean.";
  const car = garageById(id);
  const cost = car ? Math.floor(car.price * 0.35) : 400;
  if (account.cash < cost) return "NEED CASH";
  account.cash -= cost;
  box.stolen = box.stolen.filter((item) => item !== id);
  if (car && !box.garage.includes(id)) box.garage.push(id);
  note(box, "TITLE CLEAN");
  return null;
}

function takeLoan(account: Account, now: number): string | null {
  const box = ensureSandbox(account);
  if (box.loan && box.loan.balance > 0) return "You already have a loan.";
  const amount = Math.min(LOAN_CAP, Math.max(5_000, account.cash * 5));
  if (account.cash <= 0 && amount < 5_000) return "NEED CASH";
  account.cash += amount;
  box.loan = { principal: amount, balance: Math.floor(amount * LOAN_RATE), due: now + LOAN_TERM_MS };
  note(box, `+$${amount}`);
  return null;
}

function payLoan(account: Account, amount: number): string | null {
  const box = ensureSandbox(account);
  if (!box.loan || box.loan.balance <= 0) return "No loan.";
  const pay = Math.min(box.loan.balance, Math.max(0, amount));
  if (pay <= 0 || account.cash < pay) return "NEED CASH";
  account.cash -= pay;
  box.loan.balance -= pay;
  if (box.loan.balance <= 0) {
    box.loan = null;
    box.loanPaid = true;
    note(box, "LOAN PAID");
  }
  return null;
}

function insure(account: Account, kind: string, now: number): string | null {
  const box = ensureSandbox(account);
  const cost = kind === "business" ? INSURE_BUSINESS_DAY : INSURE_VEHICLE_DAY;
  if (kind !== "business" && kind !== "vehicles") return "Unknown policy.";
  if (account.cash < cost) return "NEED CASH";
  account.cash -= cost;
  if (kind === "business") box.insureBusiness = true;
  else box.insureVehicles = true;
  box.insureDay = dayKey(now);
  note(box, "INSURED");
  return null;
}

function bid(account: Account, amount: number, now: number): string | null {
  tickAuction(now);
  const auction = world.auction;
  if (!auction) return "No auction.";
  const top = auction.bids.reduce((best, row) => Math.max(best, row.amount), AUCTION_LOTS[auction.index % AUCTION_LOTS.length].start);
  const escrow = auction.bids.find((row) => row.id === account.id)?.amount ?? 0;
  if (amount < top + 1_000) return "BID HIGHER";
  if (account.cash + escrow < amount) return "NEED CASH";
  for (const row of auction.bids) {
    const other = getAccount(row.id);
    if (!other) continue;
    other.cash += row.amount;
    if (row.id !== account.id) note(ensureSandbox(other), "OUTBID");
  }
  account.cash -= amount;
  auction.bids = [{ id: account.id, name: account.username || "PLAYER", amount }];
  return null;
}

function blackBuy(account: Account, id: string, now: number): string | null {
  const data = account.economy;
  const box = ensureSandbox(account);
  const open = box.stolen.length > 0 || (data?.robberyAt ?? 0) > 0;
  if (!open) return "The market does not know you.";
  const item = BLACK_MARKET.find((row) => row.id === id);
  if (!item) return "Not for sale.";
  if (account.cash < item.price) return "NEED CASH";
  account.cash -= item.price;
  const heat = Math.random() < (id === "case" ? 0.5 : 0.2);
  if (id === "case") {
    if (!heat) {
      account.cash += 12_000;
      note(box, "+$12000");
    } else {
      box.wanted = Math.max(box.wanted, 3);
      box.wantedAt = now;
      note(box, "THE SELLER TALKED");
    }
    return null;
  }
  if (id === "diamond" && data && !data.items.includes("diamond")) data.items.push("diamond");
  if (id === "hot-coupe") {
    if (!box.stolen.includes("coupe")) box.stolen.push("coupe");
    box.spawned = "coupe";
  }
  if (heat) {
    box.wanted = Math.max(box.wanted, 2);
    box.wantedAt = now;
  }
  return null;
}

function createCrew(account: Account, name: string): string | null {
  const trimmed = name.trim().slice(0, 16);
  if (trimmed.length < 2) return "Name the crew.";
  const box = ensureSandbox(account);
  if (box.crewId) return "You are already in a crew.";
  if (account.cash < 1_000) return "NEED CASH";
  account.cash -= 1_000;
  const crew: Crew = {
    code: code(),
    name: trimmed,
    leader: account.id,
    treasury: 0,
    pot: {},
    shop: "",
    shopFund: 0,
    lastPay: Date.now(),
    members: [account.id],
  };
  world.crews.set(crew.code, crew);
  box.crewId = crew.code;
  note(box, crew.code);
  return null;
}

function joinCrew(account: Account, crewCode: string): string | null {
  const crew = world.crews.get(crewCode);
  if (!crew) return "No crew with that code.";
  const box = ensureSandbox(account);
  if (box.crewId) return "Leave your crew first.";
  if (crew.members.length >= 8) return "That crew is full.";
  crew.members.push(account.id);
  box.crewId = crew.code;
  return null;
}

function leaveCrew(account: Account): string | null {
  const box = ensureSandbox(account);
  const crew = world.crews.get(box.crewId);
  if (!crew) {
    box.crewId = "";
    return null;
  }
  delete crew.pot[account.id];
  crew.members = crew.members.filter((id) => id !== account.id);
  if (crew.leader === account.id) {
    const next = crew.members[0];
    if (next) crew.leader = next;
    else world.crews.delete(crew.code);
  }
  box.crewId = "";
  return null;
}

function fundCrew(account: Account, amount: number): string | null {
  const box = ensureSandbox(account);
  const crew = world.crews.get(box.crewId);
  if (!crew) return "You have no crew.";
  if (amount < 1 || account.cash < amount) return "NEED CASH";
  account.cash -= amount;
  crew.treasury += amount;
  return null;
}

function fundShop(account: Account, id: string, amount: number): string | null {
  const business = businessById(id);
  if (!business) return "Unknown business.";
  const box = ensureSandbox(account);
  const crew = world.crews.get(box.crewId);
  if (!crew) return "You have no crew.";
  if (crew.shop && crew.shop !== id) return "The crew already owns a shop.";
  if (amount < 1 || account.cash < amount) return "NEED CASH";
  account.cash -= amount;
  crew.shop = id;
  crew.shopFund += amount;
  crew.pot[account.id] = (crew.pot[account.id] ?? 0) + amount;
  return null;
}

function postJob(account: Account, kind: string, reward: number): string | null {
  const template = CONTRACTS.find((job) => job.id === kind);
  if (!template) return "Unknown job.";
  if (reward < 1_000 || reward > 100_000) return "Reward must be between $1,000 and $100,000.";
  if (account.cash < reward) return "NEED CASH";
  if (world.jobs.some((job) => job.by === account.id && !job.taker)) return "You already have an open job.";
  account.cash -= reward;
  world.jobs.push({
    id: `job-${world.seq++}`,
    kind,
    by: account.id,
    reward,
    taker: "",
    at: Date.now(),
  });
  return null;
}

function takeJob(account: Account, id: string, now: number): string | null {
  const box = ensureSandbox(account);
  if (box.jobId) return "Finish your job first.";
  const open = npcJobs(now).find((job) => job.id === id) ?? world.jobs.find((job) => job.id === id && !job.taker);
  if (!open) return "That job is gone.";
  if (open.by === account.id) return "That is your own job.";
  if (id.startsWith("npc-") && world.claimedJobs.has(id)) return "Someone already took that.";
  if (!id.startsWith("npc-")) {
    const posted = world.jobs.find((job) => job.id === id);
    if (posted) posted.taker = account.id;
  } else world.claimedJobs.add(id);
  box.jobId = id;
  box.jobAt = now;
  return null;
}

function finishJob(account: Account, id: string, x: number, y: number, now: number): string | null {
  const box = ensureSandbox(account);
  if (box.jobId !== id) return "You did not take that job.";
  const posted = world.jobs.find((job) => job.id === id && job.taker === account.id);
  const kind = posted?.kind ?? id.split("-")[1];
  const template = CONTRACTS.find((job) => job.id === kind);
  if (!template) return "That job is gone.";
  if (now - box.jobAt < 8_000) return "TOO FAST";
  if (!near(x, y, template.x * 2, template.y * 2, 220)) return "Not there yet.";
  const reward = posted?.reward ?? template.reward;
  account.cash += reward;
  if (account.economy) account.economy.earnedToday += reward;
  box.jobId = "";
  if (posted) world.jobs = world.jobs.filter((job) => job.id !== posted.id);
  note(box, `+$${reward}`);
  return null;
}

function npcJobs(now: number): Job[] {
  const slot = Math.floor(now / (4 * 60 * 1000));
  return [0, 1].map((offset) => {
    const template = CONTRACTS[(slot + offset) % CONTRACTS.length];
    return { id: `npc-${template.id}-${slot}`, kind: template.id, by: "city", reward: template.reward, taker: "", at: slot * 4 * 60 * 1000 };
  });
}

function raceClock(account: Account, now: number): string | null {
  if (account.cash < RACE_ENTRY) return "NEED CASH";
  account.cash -= RACE_ENTRY;
  const id = `clock-${account.id}`;
  world.races.set(id, {
    id,
    mode: "clock",
    entry: RACE_ENTRY,
    by: account.id,
    status: "live",
    started: now,
    ends: now + 90_000,
    pot: RACE_ENTRY,
    step: { [account.id]: { index: -1, at: now } },
    winner: "",
  });
  return null;
}

function raceOpen(account: Account, now: number): string | null {
  if ([...world.races.values()].some((race) => race.by === account.id && race.status !== "done")) return "You already have a race.";
  if (account.cash < RACE_ENTRY) return "NEED CASH";
  account.cash -= RACE_ENTRY;
  const id = `race-${world.seq++}`;
  world.races.set(id, {
    id,
    mode: "pvp",
    entry: RACE_ENTRY,
    by: account.id,
    status: "open",
    started: now,
    ends: now + 45_000,
    pot: RACE_ENTRY,
    step: { [account.id]: { index: -1, at: now } },
    winner: "",
  });
  note(ensureSandbox(account), "RACE OPEN");
  return null;
}

function raceJoin(account: Account, id: string, now: number): string | null {
  const race = world.races.get(id);
  if (!race || race.status !== "open") return "That race is closed.";
  if (race.by === account.id) return "Wait for another driver.";
  if (account.cash < race.entry) return "NEED CASH";
  account.cash -= race.entry;
  race.pot += race.entry;
  race.status = "live";
  race.started = now;
  race.ends = now + 90_000;
  race.step[account.id] = { index: -1, at: now };
  return null;
}

function raceStep(account: Account, x: number, y: number, now: number): string | null {
  const race = [...world.races.values()].find((item) => item.status === "live" && item.step[account.id]);
  if (!race) return "You are not in a race.";
  const step = race.step[account.id];
  const next = step.index + 1;
  const point = RACE_POINTS[next];
  if (!point) return "Already finished.";
  if (now - step.at < RACE_LEG_MS) return "TOO FAST";
  if (!near(x, y, point.x * 2, point.y * 2, 200)) return "Not at the checkpoint.";
  step.index = next;
  step.at = now;
  if (next < RACE_POINTS.length - 1) return null;
  const box = ensureSandbox(account);
  const data = account.economy;
  if (data) data.progress.race = 1;
  if (race.mode === "clock") {
    const elapsed = now - race.started;
    if (elapsed <= RACE_PAR_MS) {
      account.cash += RACE_WIN;
      box.raceWins += 1;
      note(box, "RACE WON");
    } else note(box, "TOO SLOW");
    world.races.delete(race.id);
    return null;
  }
  if (!race.winner) {
    race.winner = account.id;
    account.cash += RACE_WIN;
    box.raceWins += 1;
    note(box, "RACE WON");
    for (const member of Object.keys(race.step)) {
      if (member === account.id) continue;
      const other = getAccount(member);
      if (other) {
        other.cash += RACE_SECOND;
        note(ensureSandbox(other), "SECOND PLACE");
      }
    }
    world.races.delete(race.id);
  }
  return null;
}

function claimBounty(account: Account, targetId: string, now: number): string | null {
  if (!targetId || targetId === account.id) return "Not your bounty.";
  const bounty = world.bounties.get(targetId);
  const target = getAccount(targetId);
  if (!bounty || !target) return "No bounty.";
  if (now - bounty.at < 15_000) return "TOO SOON";
  const hunter = ensureSandbox(account);
  const previous = hunter.bountyClaimAt[targetId] ?? 0;
  if (now - previous < 10 * 60 * 1000) return "You already hunted them.";
  const mark = ensureSandbox(target);
  if (now - hunter.seenAt > 10_000 || now - mark.seenAt > 10_000) return "They are not on the island.";
  if (!near(hunter.x, hunter.y, mark.x, mark.y, 180)) return "Get closer.";
  account.cash += bounty.reward;
  hunter.bountyClaims += 1;
  hunter.bountyClaimAt[targetId] = now;
  mark.wanted = 0;
  world.bounties.delete(targetId);
  note(hunter, `+$${bounty.reward}`);
  note(mark, "BOUNTY PAID");
  return null;
}

function clearHeat(account: Account, reason: string, now: number): string | null {
  const box = ensureSandbox(account);
  if (reason === "bust") {
    if (box.insureVehicles && box.claimDay !== dayKey(now) && box.spawned) {
      const car = garageById(box.spawned);
      if (car) {
        account.cash += Math.floor(car.price * 0.3);
        box.claimDay = dayKey(now);
        note(box, "INSURANCE PAID");
      }
    }
    box.wanted = 0;
    world.bounties.delete(account.id);
    return null;
  }
  if (reason === "escape" && box.wantedAt > 0 && now - box.wantedAt >= 90_000) {
    box.wanted = 0;
    world.bounties.delete(account.id);
  }
  return null;
}

function claimDrop(account: Account, x: number, y: number, now: number): string | null {
  const key = dropKey(now);
  if (world.drops.has(key)) return "Someone else got it.";
  const spot = dropPoint(now);
  if (!near(x, y, spot.x, spot.y, 220)) return "Not at the drop.";
  world.drops.add(key);
  const data = account.economy;
  const roll = Math.floor(Math.random() * 3);
  const box = ensureSandbox(account);
  if (roll === 0) {
    account.cash += 2_500;
    note(box, "+$2500");
  } else if (roll === 1 && data && !data.items.includes("coin")) {
    data.items.push("coin");
    note(box, "GOLDEN COIN");
  } else {
    account.cash += 800;
    note(box, "+$800");
  }
  return null;
}

function moveSafe(account: Account, side: string, amount: number): string | null {
  const box = ensureSandbox(account);
  if (amount < 1) return "Enter an amount.";
  if (side === "out") {
    if (box.safe < amount) return "The safe is short.";
    box.safe -= amount;
    account.cash += amount;
    return null;
  }
  if (account.cash < amount) return "NEED CASH";
  account.cash -= amount;
  box.safe += amount;
  return null;
}

function setTheme(account: Account, theme: string): string | null {
  if (!HOME_THEMES.includes(theme as (typeof HOME_THEMES)[number])) return "Unknown look.";
  ensureSandbox(account).theme = theme;
  return null;
}

export function assetAdjust(account: Account): number {
  const box = ensureSandbox(account);
  const cars = box.garage.reduce((sum, id) => sum + (garageById(id)?.price ?? 0), 0);
  return cars + box.safe - (box.loan?.balance ?? 0);
}

export function buildSocial(account: Account, now: number): SocialView {
  const box = ensureSandbox(account);
  const sale = flash(now);
  const crew = world.crews.get(box.crewId) ?? null;
  const race = [...world.races.values()].find((item) => item.status !== "done" && (item.by === account.id || item.step[account.id]));
  const openRace = [...world.races.values()].find((item) => item.status === "open" && item.by !== account.id) ?? null;
  const auction = world.auction;
  const lot = auction ? AUCTION_LOTS[auction.index % AUCTION_LOTS.length] : null;
  const topBid = auction?.bids.reduce((best, row) => (row.amount > best.amount ? row : best), auction.bids[0]);
  const data = account.economy;
  const jobId = box.jobId;
  const jobs = [...npcJobs(now), ...world.jobs.filter((job) => !job.taker || job.taker === account.id || job.by === account.id)].map((job) => {
    const template = CONTRACTS.find((item) => item.id === job.kind);
    return {
      id: job.id,
      title: template?.title ?? "JOB",
      detail: template?.detail ?? "",
      reward: job.by === "city" ? template?.reward ?? job.reward : job.reward,
      by: job.by === "city" ? "CITY" : job.by === account.id ? "YOU" : "PLAYER",
      accepted: jobId === job.id || job.taker === account.id,
    };
  });
  const dropLive = !world.drops.has(dropKey(now));
  const point = dropPoint(now);
  const toast = box.toast;
  box.toast = "";
  const shop = crew?.shop ? businessById(crew.shop) : undefined;
  const funded = crew?.shopFund ?? 0;
  const mine = crew ? crew.pot[account.id] ?? 0 : 0;
  const totalPot = crew ? Object.values(crew.pot).reduce((sum, value) => sum + value, 0) : 0;
  return {
    wanted: box.wanted,
    bountyOnYou: world.bounties.get(account.id)?.reward ?? 0,
    bounties: [...world.bounties.entries()]
      .filter(([id]) => id !== account.id)
      .map(([id, bounty]) => ({ id, username: bounty.username, reward: bounty.reward, stars: bounty.stars })),
    garage: GARAGE.map((car) => ({
      id: car.id,
      name: car.name,
      tier: car.tier,
      price: vehiclePrice(car.id, now),
      speed: car.speed,
      accel: car.accel,
      handling: car.handling,
      owned: box.garage.includes(car.id),
    })),
    spawned: box.spawned,
    stolen: box.stolen.map((id) => {
      const car = garageById(id);
      return { id, name: car?.name ?? id.toUpperCase(), cleanCost: car ? Math.floor(car.price * 0.35) : 400 };
    }),
    loan: box.loan
      ? { principal: box.loan.principal, balance: box.loan.balance, dueIn: box.loan.due - now, late: now > box.loan.due }
      : null,
    loanOffer: box.loan ? 0 : Math.min(LOAN_CAP, Math.max(5_000, account.cash * 5)),
    insurance: { vehicles: box.insureVehicles, businesses: box.insureBusiness },
    auction:
      auction && lot
        ? {
            name: lot.name,
            bid: topBid?.amount ?? lot.start,
            leader: topBid?.name ?? "NO BIDS",
            endsIn: Math.max(0, auction.ends - now),
            yours: topBid?.id === account.id,
          }
        : null,
    marketOpen: box.stolen.length > 0 || (data?.robberyAt ?? 0) > 0,
    crew: crew
      ? {
          code: crew.code,
          name: crew.name,
          leader: crew.leader === account.id,
          treasury: crew.treasury,
          worth: crewWorth(crew),
          members: memberRows(crew),
        }
      : null,
    crewBoard: [...world.crews.values()]
      .map((item) => ({ name: item.name, worth: crewWorth(item) }))
      .sort((a, b) => b.worth - a.worth)
      .slice(0, 8),
    crewShop: shop
      ? {
          id: shop.id,
          name: shop.name,
          cost: shop.price,
          funded,
          yourCut: totalPot > 0 ? Math.round((mine / totalPot) * 100) : 0,
        }
      : null,
    jobs: jobs.slice(0, 6),
    race: race
      ? {
          mode: race.mode,
          checkpoint: (race.step[account.id]?.index ?? -1) + 1,
          total: RACE_POINTS.length,
          pot: race.mode === "clock" ? RACE_WIN : race.pot,
        }
      : null,
    raceOpen: openRace ? { id: openRace.id, by: getAccount(openRace.by)?.username || "PLAYER", entry: openRace.entry } : null,
    flash: sale ? { name: sale.name, detail: sale.detail, endsIn: sale.endsIn } : null,
    drop: { x: point.x, y: point.y, endsIn: 180_000 - (now % 180_000), live: dropLive },
    home: {
      theme: box.theme,
      safe: box.safe,
      trophies: (data?.items ?? []).map((id) => itemById(id)?.name ?? id),
    },
    toast,
  };
}

function memberRows(crew: Crew): { name: string; put: number }[] {
  const ids = crew.members.length > 0 ? crew.members : [crew.leader];
  return ids.map((id) => ({ name: getAccount(id)?.username || "PLAYER", put: crew.pot[id] ?? 0 }));
}

function crewWorth(crew: Crew): number {
  const ids = crew.members.length > 0 ? crew.members : [crew.leader];
  let worth = crew.treasury;
  for (const id of ids) {
    const account = getAccount(id);
    if (account) worth += account.cash;
  }
  const shop = crew.shop ? businessById(crew.shop) : undefined;
  if (shop && crew.shopFund >= shop.price) worth += shop.price;
  return worth;
}

export function sandboxAchievements(account: Account): string[] {
  const box = ensureSandbox(account);
  const unlocked: string[] = [];
  if (box.bountyClaims >= 1) unlocked.push("bounty");
  if (box.crewId) unlocked.push("crew");
  if (box.loanPaid) unlocked.push("paid-off");
  if (box.raceWins >= 1) unlocked.push("checkered");
  return unlocked;
}
