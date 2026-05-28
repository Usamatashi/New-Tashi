import { Router } from "express";
import { fdb, chunkArray } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../lib/auth";
import { privateCache } from "../lib/cache";

const router = Router();

async function computeOrderValues(orderIds: number[]): Promise<Record<number, number>> {
  if (!orderIds.length) return {};
  const itemMap: Record<number, number> = {};
  const batches = chunkArray(orderIds, 30);
  for (const batch of batches) {
    const snap = await fdb.collection("orderItems").where("orderId", "in", batch).get();
    snap.forEach((doc) => {
      const item = doc.data();
      const discountPercent = item.discountPercent ?? 0;
      const discountedValue = Math.round(item.quantity * item.unitPrice * (1 - discountPercent / 100));
      itemMap[item.orderId] = (itemMap[item.orderId] ?? 0) + discountedValue;
    });
  }
  return itemMap;
}

async function computeTotalOutstanding(): Promise<number> {
  const ordersSnap = await fdb.collection("orders").where("status", "==", "dispatched").get();
  const orders = ordersSnap.docs.map((d) => d.data());
  const retailerIds = [...new Set(orders.map((o) => o.retailerId as number))];
  if (!retailerIds.length) return 0;

  const batches = chunkArray(retailerIds, 30);
  const allOrders: Array<{ id: number; retailerId: number; billDiscountPercent: number }> = [];
  const allPayments: Array<{ retailerId: number; amount: number }> = [];

  for (const batch of batches) {
    const ordersBatchSnap = await fdb.collection("orders")
      .where("status", "==", "dispatched")
      .where("retailerId", "in", batch)
      .get();
    ordersBatchSnap.forEach((doc) => {
      const o = doc.data();
      allOrders.push({
        id: o.id as number,
        retailerId: o.retailerId as number,
        billDiscountPercent: (o.billDiscountPercent as number) ?? 0,
      });
    });

    const paymentsSnap = await fdb.collection("payments").where("retailerId", "in", batch).get();
    paymentsSnap.forEach((doc) => {
      const p = doc.data();
      allPayments.push({ retailerId: p.retailerId as number, amount: p.amount as number });
    });
  }

  const orderIds = allOrders.map((o) => o.id);
  const valueMap = await computeOrderValues(orderIds);

  const debtByRetailer: Record<number, number> = {};
  for (const o of allOrders) {
    const itemsTotal = valueMap[o.id] ?? 0;
    const finalValue = Math.round(itemsTotal * (1 - o.billDiscountPercent / 100));
    debtByRetailer[o.retailerId] = (debtByRetailer[o.retailerId] ?? 0) + finalValue;
  }

  const paidByRetailer: Record<number, number> = {};
  for (const p of allPayments) {
    paidByRetailer[p.retailerId] = (paidByRetailer[p.retailerId] ?? 0) + p.amount;
  }

  let total = 0;
  for (const id of retailerIds) {
    const outstanding = (debtByRetailer[id] ?? 0) - (paidByRetailer[id] ?? 0);
    total += Math.max(0, outstanding);
  }
  return total;
}

router.get("/summary", requireAuth, requireAdmin, privateCache(15), async (req, res) => {
  try {
    const [
      pendingClaimsSnap,
      pendingOrdersSnap,
      confirmedOrdersSnap,
      websiteOrdersSnap,
      pendingPaymentsSnap,
      adsSnap,
      tickerSnap,
    ] = await Promise.all([
      fdb.collection("claims").where("status", "==", "pending").get(),
      fdb.collection("orders").where("status", "==", "pending").get(),
      fdb.collection("orders").where("status", "==", "confirmed").get(),
      fdb.collection("retail_orders").where("status", "==", "pending").get(),
      fdb.collection("payments").where("status", "==", "pending").get(),
      fdb.collection("ads").get(),
      fdb.collection("ticker").get(),
    ]);

    const websitePending = websiteOrdersSnap.docs.filter((d) => {
      const status = String(d.data().status ?? "pending").toLowerCase();
      return status === "pending";
    }).length;

    const totalOutstanding = await computeTotalOutstanding();

    res.json({
      pendingClaims: pendingClaimsSnap.size,
      pendingOrders: pendingOrdersSnap.size + confirmedOrdersSnap.size + websitePending,
      totalOutstanding,
      pendingPayments: pendingPaymentsSnap.size,
      adsCount: adsSnap.size,
      tickerCount: tickerSnap.size,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
