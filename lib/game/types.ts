export type HudSnapshot = {
  cash: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  wanted: number;
  maxWanted: number;
  objective: string;
  food: number;
  employed: boolean;
  onShift: boolean;
  driving: boolean;
  gas: number;
  maxGas: number;
  businesses: string[];
  vehicles: string[];
  netWorth: number;
};

export type MapMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
};

export type MapSnapshot = {
  width: number;
  height: number;
  water: { x: number; y: number; w: number; h: number };
  markers: MapMarker[];
};

export type WorldPos = { x: number; y: number };

export type CityProfile = {
  cash: number;
  energy: number;
  employed: boolean;
  businesses: string[];
  vehicles: string[];
  levels?: Record<string, number>;
  shares?: Record<string, number>;
  basis?: Record<string, number>;
  items?: string[];
  stockProfit?: number;
  objectivesDone?: number;
};

export type Peer = {
  id: string;
  name: string;
  x: number;
  y: number;
  at: number;
};

export type StockQuote = {
  id: string;
  name: string;
  price: number;
  shares: number;
  history: number[];
};

export type StockBook = {
  cash: number;
  quotes: StockQuote[];
  portfolio: number;
  invested: number;
  profit: number;
  returnPct: number;
};

export type StockOrder = {
  id: string;
  side: "buy" | "sell";
  quantity: number;
};

export type GroceryItem = {
  id: string;
  name: string;
  price: number;
  energy: number;
  health: number;
};

export type GroceryShelf = {
  cash: number;
  food: number;
  packSize: number;
  ownsStore: boolean;
  storePrice: number;
  items: GroceryItem[];
};

export type GameEventMap = {
  start: undefined;
  hud: HudSnapshot;
  prompt: string | null;
  robbery: number;
  banner: string | null;
  pos: WorldPos;
  map: MapSnapshot;
  "map-toggle": undefined;
  profile: CityProfile;
  peers: Peer[];
  stocks: StockBook | null;
  "stock-order": StockOrder;
  "stocks-close": undefined;
  grocery: GroceryShelf | null;
  "grocery-buy": number;
  "grocery-store": undefined;
  "grocery-close": undefined;
  escape: number | null;
  menu: undefined;
  reward: {
    id: string;
    name: string;
    ms: number;
    cash: number;
    earnings: number;
    speed: number;
    energy: number;
    gas: number;
  };
  "ad-hold": boolean;
  "bust-offer": { cash: number; loseHalf: number; loseQuarter: number };
  "bust-resolve": "half" | "quarter";
  session: SessionView;
  "spawn-boat": undefined;
  "island-offer": { id: string; username: string; worth: string } | null;
  ledger: import("@/lib/economy/model").EconomyView;
  "ledger-deny": string;
  "business-buy": string;
  "visit-port": undefined;
  "owned-spot": { id: string; name: string } | null;
};

export type SessionView = {
  code: string;
  hostId: string;
  status: "lobby" | "live";
  members: {
    id: string;
    username: string;
    cash: number;
    businesses: string[];
    reinforcements: number;
    heldBy: string;
    boat: boolean;
    employed: boolean;
  }[];
};
