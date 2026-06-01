import { prisma } from "./db";
import { dateKey } from "./week";

export type ComputedLine = {
  type: "CHARGE" | "INCIDENT";
  productId: string;
  productName: string;
  unit: string;
  qty: number;
  unitPriceP: number;
  amountP: number;
  countsToTotal: boolean;
};

/**
 * Compute invoice lines for a café over [start, end] (inclusive, UTC midnights).
 * Charges come from DELIVERED deliveries, priced from the order snapshot.
 * CONFIRMED incidents are removed from the charged quantity and listed separately
 * as INCIDENT lines (excluded from the total).
 */
export async function computeInvoice(
  cafeId: string,
  start: Date,
  end: Date,
): Promise<{ lines: ComputedLine[]; totalP: number }> {
  const [deliveries, orderLines, incidents] = await Promise.all([
    prisma.delivery.findMany({
      where: { cafeId, status: "DELIVERED", date: { gte: start, lte: end } },
      include: { items: { include: { product: { select: { id: true, name: true, unit: true, priceP: true } } } } },
    }),
    prisma.orderLine.findMany({
      where: { orderWeek: { cafeId }, date: { gte: start, lte: end } },
      select: { date: true, productId: true, priceSnapshotP: true },
    }),
    prisma.incident.findMany({
      where: { status: "CONFIRMED", delivery: { cafeId, status: "DELIVERED", date: { gte: start, lte: end } } },
      select: { deliveryId: true, productId: true, qty: true },
    }),
  ]);

  const priceMap = new Map<string, number>();
  for (const ol of orderLines) priceMap.set(`${dateKey(ol.date)}|${ol.productId}`, ol.priceSnapshotP);

  const incMap = new Map<string, number>();
  for (const inc of incidents) {
    const k = `${inc.deliveryId}|${inc.productId}`;
    incMap.set(k, (incMap.get(k) ?? 0) + inc.qty);
  }

  type Agg = {
    name: string;
    unit: string;
    unitPriceP: number;
    billableQty: number;
    chargeAmountP: number;
    incidentQty: number;
    incidentAmountP: number;
  };
  const agg = new Map<string, Agg>();

  for (const d of deliveries) {
    const dk = dateKey(d.date);
    for (const it of d.items) {
      const price = priceMap.get(`${dk}|${it.productId}`) ?? it.product.priceP;
      const incQty = Math.min(incMap.get(`${d.id}|${it.productId}`) ?? 0, it.qty);
      const billable = it.qty - incQty;
      const a = agg.get(it.productId) ?? {
        name: it.product.name,
        unit: it.product.unit,
        unitPriceP: price,
        billableQty: 0,
        chargeAmountP: 0,
        incidentQty: 0,
        incidentAmountP: 0,
      };
      a.unitPriceP = price;
      a.billableQty += billable;
      a.chargeAmountP += billable * price;
      a.incidentQty += incQty;
      a.incidentAmountP += incQty * price;
      agg.set(it.productId, a);
    }
  }

  const lines: ComputedLine[] = [];
  for (const [productId, a] of agg) {
    if (a.billableQty > 0) {
      lines.push({
        type: "CHARGE",
        productId,
        productName: a.name,
        unit: a.unit,
        qty: a.billableQty,
        unitPriceP: a.unitPriceP,
        amountP: a.chargeAmountP,
        countsToTotal: true,
      });
    }
    if (a.incidentQty > 0) {
      lines.push({
        type: "INCIDENT",
        productId,
        productName: a.name,
        unit: a.unit,
        qty: a.incidentQty,
        unitPriceP: a.unitPriceP,
        amountP: a.incidentAmountP,
        countsToTotal: false,
      });
    }
  }

  lines.sort(
    (x, y) =>
      x.productName.localeCompare(y.productName) ||
      (x.type === y.type ? 0 : x.type === "CHARGE" ? -1 : 1),
  );

  const totalP = lines.filter((l) => l.countsToTotal).reduce((s, l) => s + l.amountP, 0);
  return { lines, totalP };
}
