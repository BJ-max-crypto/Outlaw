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
  businesses: string[];
  vehicles: string[];
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
};

export type StockOrder = {
  id: string;
  side: "buy" | "sell";
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
  escape: number | null;
};
