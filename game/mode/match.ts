import { businessById } from "@/game/world/catalog";
import { TUNING } from "@/game/tuning";
import type { CityProfile } from "@/lib/game/types";

export const ISLAND_SPAN = 1254 * 2;
export const ISLAND_GAP = 980;

const SALE_NAMES = ["EAST", "SOUTH", "OUTER"];

export type IslandCard = {
  id: string;
  username: string;
  businesses: string[];
  reinforcements: number;
  heldBy: string;
  cash: number;
  boat: boolean;
  employed: boolean;
};

export type MatchConfig = {
  mode: "single" | "multi";
  autostart: boolean;
  playerId: string;
  username: string;
  code: string;
  islands: IslandCard[];
};

const single: MatchConfig = {
  mode: "single",
  autostart: false,
  playerId: "",
  username: "",
  code: "",
  islands: [],
};

let current = single;
let pendingProfile: CityProfile | null = null;

export function setMatch(next: MatchConfig): void {
  current = next;
}

export function getMatch(): MatchConfig {
  return current;
}

/** Islands sit on a grid in the ocean. Index 0 is the local player's home. */
export function islandOrigin(index: number): { x: number; y: number } {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return { x: col * (ISLAND_SPAN + ISLAND_GAP), y: row * (ISLAND_SPAN + ISLAND_GAP) };
}

export type SharedSpot = {
  islandId: string;
  x: number;
  y: number;
  fromId: string;
  toId: string;
  along: number;
};

function islandCenter(index: number): { x: number; y: number } {
  const origin = islandOrigin(index);
  return { x: origin.x + ISLAND_SPAN / 2, y: origin.y + ISLAND_SPAN / 2 };
}

/** Where this player is, in a form every other client can place on their own map. */
export function shareSpot(x: number, y: number, islands: { id: string }[]): SharedSpot {
  for (let index = 0; index < islands.length; index += 1) {
    const origin = islandOrigin(index);
    const inside = x >= origin.x && y >= origin.y && x <= origin.x + ISLAND_SPAN && y <= origin.y + ISLAND_SPAN;
    if (!inside) continue;
    const id = islands[index].id;
    return { islandId: id, x: x - origin.x, y: y - origin.y, fromId: id, toId: id, along: -1 };
  }
  const centers = islands.map((island, index) => ({ id: island.id, ...islandCenter(index) }));
  centers.sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2));
  const from = centers[0];
  const to = centers[1] ?? from;
  if (!from) return { islandId: "", x, y, fromId: "", toId: "", along: -1 };
  const abx = to.x - from.x;
  const aby = to.y - from.y;
  const length = abx * abx + aby * aby || 1;
  const along = Math.max(0, Math.min(1, ((x - from.x) * abx + (y - from.y) * aby) / length));
  return { islandId: from.id, x: 0, y: 0, fromId: from.id, toId: to.id, along };
}

/** Place a shared spot onto this client's island layout. */
export function viewSpot(spot: SharedSpot, islands: { id: string }[]): { x: number; y: number } {
  const indexOf = (id: string) => {
    const index = islands.findIndex((island) => island.id === id);
    return index < 0 ? 0 : index;
  };
  if (spot.along < 0 || spot.fromId === spot.toId) {
    const origin = islandOrigin(indexOf(spot.islandId));
    return { x: origin.x + spot.x, y: origin.y + spot.y };
  }
  const from = islandCenter(indexOf(spot.fromId));
  const to = islandCenter(indexOf(spot.toId));
  return { x: from.x + (to.x - from.x) * spot.along, y: from.y + (to.y - from.y) * spot.along };
}

/** Singleplayer starts on one island. The other three are for sale across the water. */
export function saleIslands(playerId: string, username: string): IslandCard[] {
  const home: IslandCard = {
    id: playerId,
    username: username || "HOME",
    businesses: [],
    reinforcements: 0,
    heldBy: playerId,
    cash: 0,
    boat: false,
    employed: false,
  };
  const extras = SALE_NAMES.map((name, index) => ({
    id: `sale-${index + 1}`,
    username: name,
    businesses: ["grocery", "diner", "club", "quickstop"],
    reinforcements: 0,
    heldBy: "",
    cash: 0,
    boat: false,
    employed: true,
  }));
  return [home, ...extras];
}

export function islandIncome(card: IslandCard): number {
  const businesses = card.businesses.reduce((sum, id) => sum + (businessById(id)?.income ?? 0), 0);
  const job = card.employed ? TUNING.jobPay : 0;
  return businesses + job + card.reinforcements * TUNING.reinforcementPay;
}

/** Home island is always index 0 so the local player keeps the original map coordinates. */
export function orderIslands(islands: IslandCard[], playerId: string): IslandCard[] {
  const mine = islands.find((island) => island.id === playerId);
  const rest = islands.filter((island) => island.id !== playerId);
  return mine ? [mine, ...rest] : islands;
}

/** Pay collected from islands you hold, plus reinforcements on an island you still own. */
export function heldIncome(islands: IslandCard[], playerId: string): number {
  const foreign = islands
    .filter((island) => island.id !== playerId && island.heldBy === playerId)
    .reduce((sum, island) => sum + islandIncome(island), 0);
  const own = islands.find((island) => island.id === playerId);
  const reinforcements = own && own.heldBy === playerId ? own.reinforcements * TUNING.reinforcementPay : 0;
  return foreign + reinforcements;
}

export function setPendingProfile(profile: CityProfile | null): void {
  pendingProfile = profile;
}

export function takePendingProfile(): CityProfile | null {
  const profile = pendingProfile;
  pendingProfile = null;
  return profile;
}
