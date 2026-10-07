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
