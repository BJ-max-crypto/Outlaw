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

export const FOODS: FoodItem[] = [
  { id: "taco", name: "TACO", price: 12, energy: 28, health: 0 },
  { id: "burger", name: "BURGER", price: 22, energy: 50, health: 10 },
  { id: "drink", name: "DRINK", price: 9, energy: 22, health: 0 },
];

export const BUSINESSES: BusinessDef[] = [
  { id: "quickstop", name: "QUICK STOP", price: 2000, income: 18, robMin: 280, robMax: 640, wanted: 3 },
  { id: "pawn", name: "PAWN", price: 1100, income: 10, robMin: 160, robMax: 340, wanted: 2 },
  { id: "diner", name: "DINER", price: 1400, income: 12, robMin: 180, robMax: 380, wanted: 2 },
  { id: "club", name: "CLUB", price: 2600, income: 22, robMin: 320, robMax: 700, wanted: 3 },
  { id: "mart", name: "MART", price: 1800, income: 14, robMin: 140, robMax: 300, wanted: 2 },
];

export function businessById(id: string): BusinessDef | undefined {
  return BUSINESSES.find((business) => business.id === id);
}
