/** Shared rules for the social layer. No map geometry lives here beyond existing building footprints. */

export type VehicleTier = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type GarageCar = {
  id: string;
  name: string;
  tier: VehicleTier;
  price: number;
  speed: number;
  accel: number;
  handling: number;
  texture: string;
};

export const GARAGE: GarageCar[] = [
  { id: "beater", name: "BEATER", tier: "Common", price: 800, speed: 380, accel: 0.85, handling: 0.9, texture: "car-white" },
  { id: "stripe", name: "STRIPE", tier: "Common", price: 1_600, speed: 430, accel: 1, handling: 1, texture: "car-red" },
  { id: "coupe", name: "COUPE", tier: "Uncommon", price: 4_200, speed: 500, accel: 1.15, handling: 1.1, texture: "car-blue" },
  { id: "suv", name: "SUV", tier: "Uncommon", price: 3_800, speed: 400, accel: 0.9, handling: 0.82, texture: "car-olive" },
  { id: "racer", name: "RACER", tier: "Rare", price: 12_000, speed: 560, accel: 1.3, handling: 1.2, texture: "car-yellow" },
  { id: "night", name: "NIGHT", tier: "Epic", price: 28_000, speed: 610, accel: 1.4, handling: 1.28, texture: "car-blue" },
  { id: "crown", name: "CROWN", tier: "Legendary", price: 75_000, speed: 660, accel: 1.55, handling: 1.35, texture: "car-yellow" },
];

export type RobSite = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  min: number;
  max: number;
  wanted: number;
};

/** Source-pixel footprints of buildings that already exist on the island. */
export const ROB_SITES: RobSite[] = [
  { id: "grocery", name: "GROCERY", x: 286, y: 214, w: 150, h: 130, min: 140, max: 300, wanted: 2 },
  { id: "diner", name: "DINER", x: 560, y: 880, w: 160, h: 120, min: 180, max: 380, wanted: 2 },
  { id: "quickstop", name: "QUICK STOP", x: 268, y: 868, w: 150, h: 120, min: 280, max: 640, wanted: 3 },
  { id: "club", name: "CLUB", x: 540, y: 590, w: 120, h: 130, min: 320, max: 700, wanted: 3 },
  { id: "port", name: "PORT", x: 750, y: 300, w: 190, h: 170, min: 900, max: 1_600, wanted: 4 },
  { id: "stock", name: "STOCKS", x: 824, y: 690, w: 100, h: 130, min: 1_400, max: 2_600, wanted: 5 },
];

/** A loop along roads that are already on the island. Source pixels. */
export const RACE_POINTS = [
  { x: 500, y: 450 },
  { x: 760, y: 420 },
  { x: 900, y: 500 },
  { x: 700, y: 800 },
  { x: 450, y: 960 },
];

/** Supply drops stay off the spawn corner so walking onto the island does not collect one. */
export const DROP_SPOTS = [
  { x: 900, y: 500 },
  { x: 700, y: 800 },
  { x: 450, y: 960 },
  { x: 820, y: 360 },
];

export const RACE_ENTRY = 5_000;
export const RACE_WIN = 9_000;
export const RACE_SECOND = 1_000;
export const RACE_PAR_MS = 22_000;
export const RACE_LEG_MS = 1_600;

export const LOAN_CAP = 500_000;
export const LOAN_RATE = 1.08;
export const LOAN_TERM_MS = 15 * 60 * 1000;

export const INSURE_VEHICLE_DAY = 500;
export const INSURE_BUSINESS_DAY = 2_000;

export type ContractKind = "delivery" | "collection" | "escort";

export const CONTRACTS: { id: ContractKind; title: string; detail: string; reward: number; x: number; y: number }[] = [
  { id: "delivery", title: "DELIVERY", detail: "Deliver the package to the port.", reward: 15_000, x: 860, y: 380 },
  { id: "collection", title: "COLLECTION", detail: "Pick up the take at the diner.", reward: 8_000, x: 640, y: 940 },
  { id: "escort", title: "TIMED RUN", detail: "Reach the stock floor before the clock dies.", reward: 12_000, x: 880, y: 750 },
];

export const BLACK_MARKET = [
  { id: "case", name: "SEALED CASE", price: 5_000, detail: "Even odds on $12,000. Otherwise the cops hear about it." },
  { id: "diamond", name: "DIAMOND", price: 40_000, detail: "A rare stone for the trophy shelf. Sometimes the seller is watched." },
  { id: "hot-coupe", name: "HOT COUPE", price: 1_800, detail: "A stolen coupe. It stays hot until you clean the title." },
];

export const AUCTION_LOTS = [
  { id: "crown", name: "CROWN", kind: "car" as const, start: 40_000 },
  { id: "diamond", name: "DIAMOND", kind: "item" as const, start: 12_000 },
  { id: "night", name: "NIGHT", kind: "car" as const, start: 15_000 },
];

export const HOME_THEMES = ["slate", "sand", "night"] as const;

export type SocialView = {
  wanted: number;
  bountyOnYou: number;
  bounties: { id: string; username: string; reward: number; stars: number }[];
  garage: { id: string; name: string; tier: string; price: number; speed: number; accel: number; handling: number; owned: boolean }[];
  spawned: string;
  stolen: { id: string; name: string; cleanCost: number }[];
  loan: { principal: number; balance: number; dueIn: number; late: boolean } | null;
  loanOffer: number;
  insurance: { vehicles: boolean; businesses: boolean };
  auction: { name: string; bid: number; leader: string; endsIn: number; yours: boolean } | null;
  marketOpen: boolean;
  crew: {
    code: string;
    name: string;
    leader: boolean;
    treasury: number;
    worth: number;
    members: { name: string; put: number }[];
  } | null;
  crewBoard: { name: string; worth: number }[];
  crewShop: { id: string; name: string; cost: number; funded: number; yourCut: number } | null;
  jobs: { id: string; title: string; detail: string; reward: number; by: string; accepted: boolean }[];
  race: { mode: string; checkpoint: number; total: number; pot: number } | null;
  raceOpen: { id: string; by: string; entry: number } | null;
  flash: { name: string; detail: string; endsIn: number } | null;
  drop: { x: number; y: number; endsIn: number; live: boolean } | null;
  home: { theme: string; safe: number; trophies: string[] };
  toast: string;
};

export function garageById(id: string): GarageCar | undefined {
  return GARAGE.find((car) => car.id === id);
}

export function robSite(id: string): RobSite | undefined {
  return ROB_SITES.find((site) => site.id === id);
}

export function insideSite(site: RobSite, worldX: number, worldY: number): boolean {
  const x = worldX / 2;
  const y = worldY / 2;
  return x >= site.x && y >= site.y && x <= site.x + site.w && y <= site.y + site.h;
}
