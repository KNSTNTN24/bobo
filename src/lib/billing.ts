export const INVOICE_PERIODS = ["WEEKLY", "MONTHLY"] as const;
export type InvoicePeriod = (typeof INVOICE_PERIODS)[number];

export function isInvoicePeriod(v: unknown): v is InvoicePeriod {
  return typeof v === "string" && (INVOICE_PERIODS as readonly string[]).includes(v);
}

export function invoicePeriodLabel(p: string): string {
  if (p === "WEEKLY") return "Weekly";
  if (p === "MONTHLY") return "Monthly";
  return p;
}

/** Human label for the invoice anchor given the period. */
export function invoiceAnchorLabel(period: string, anchor: number): string {
  if (period === "WEEKLY") {
    const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days[anchor] ?? String(anchor);
  }
  return `day ${anchor}`;
}
