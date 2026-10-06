export function formatCash(amount: number): string {
  return `$${Math.max(0, Math.floor(amount)).toLocaleString("en-US")}`;
}
