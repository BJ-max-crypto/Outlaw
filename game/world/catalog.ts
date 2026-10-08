export type FoodItem = {
  id: string;
  name: string;
  price: number;
  energy: number;
  health: number;
};

export type BusinessDef = {
  id: string;
  name: string;
  price: number;
  income: number;
  robMin: number;
  robMax: number;
  wanted: number;
};

export type StockDef = {
  id: string;
  name: string;
  price: number;
};

export const FOODS: FoodItem[] = [
  { id: "taco", name: "TACO", price: 12, energy: 28, health: 0 },
  { id: "burger", name: "BURGER", price: 22, energy: 50, health: 10 },
  { id: "drink", name: "DRINK", price: 9, energy: 22, health: 0 },
];

export const BUSINESSES: BusinessDef[] = [
  { id: "quickstop", name: "QUICK STOP", price: 2000, income: 18, robMin: 280, robMax: 640, wanted: 3 },
  { id: "diner", name: "DINER", price: 1400, income: 12, robMin: 180, robMax: 380, wanted: 2 },
  { id: "club", name: "CLUB", price: 2600, income: 22, robMin: 320, robMax: 700, wanted: 3 },
  { id: "grocery", name: "GROCERY", price: 1800, income: 14, robMin: 140, robMax: 300, wanted: 2 },
];

export const STOCKS: StockDef[] = [
  { id: "isle", name: "COASTAL", price: 48 },
  { id: "harbor", name: "PORT CO.", price: 86 },
  { id: "neon", name: "NEON", price: 64 },
  { id: "fuel", name: "QUICKSTOP", price: 35 },
];

export type MarketQuote = StockDef & { history: number[] };

/** A short price path so each chart is already a line when the desk opens. */
export function seedQuotes(): MarketQuote[] {
  return STOCKS.map((stock) => {
    const history: number[] = [];
    let price = stock.price;
    for (let i = 0; i < 16; i += 1) {
      history.push(Math.round(price));
      price = Math.min(400, Math.max(8, price * (1 + (Math.random() - 0.5) * 0.1)));
    }
    return { id: stock.id, name: stock.name, price: history[history.length - 1], history };
  });
}

export function businessById(id: string): BusinessDef | undefined {
  return BUSINESSES.find((business) => business.id === id);
}
