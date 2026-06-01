const SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  RUB: "₽",
};

/** Format integer pence as a currency string, e.g. 180 -> "£1.80". */
export function formatMoney(pence: number, currency = "GBP"): string {
  const symbol = SYMBOLS[currency] ?? "";
  const sign = pence < 0 ? "-" : "";
  return `${sign}${symbol}${(Math.abs(pence) / 100).toFixed(2)}`;
}
