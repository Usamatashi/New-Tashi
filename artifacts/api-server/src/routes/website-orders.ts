import { Router } from "express";
import { fdb, toISOString } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../lib/auth";

const RETAIL_COL = "retail_orders";
const ALLOWED = new Set(["pending", "dispatched", "cancelled"]);

function serializeOrder(id: string, data: Record<string, unknown> | undefined) {
  return {
    id,
    status: String(data?.status ?? "pending").toLowerCase(),
    createdAt: toISOString(data?.createdAt),
    customer: data?.customer ?? {},
    delivery: data?.delivery ?? {},
    payment: data?.payment ?? {},
    items: Array.isArray(data?.items) ? data.items : [],
    subtotal: Number(data?.subtotal ?? 0),
    total: Number(data?.total ?? 0),
  };
}

const router = Router();

/** List website (retail) orders — same data as tashi-admin-electron retail_orders. */
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    const snap = await fdb.collection(RETAIL_COL).get();
    let orders = snap.docs
      .map((d) => serializeOrder(d.id, d.data()))
      .sort(
        (a, b) =>
          (b.createdAt ? Date.parse(b.createdAt) : 0) -
          (a.createdAt ? Date.parse(a.createdAt) : 0),
      );

    if (status && ALLOWED.has(status)) {
      orders = orders.filter((o) => o.status === status);
    }

    res.json({ orders, count: orders.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list website orders" });
  }
});

router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }
    const snap = await fdb.collection(RETAIL_COL).doc(id).get();
    if (!snap.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(serializeOrder(snap.id, snap.data()));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const status = String(req.body?.status ?? "").toLowerCase();
    if (!id) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }
    if (!ALLOWED.has(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const ref = fdb.collection(RETAIL_COL).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await ref.update({
      status,
      updatedAt: new Date(),
    });

    res.json(serializeOrder(id, { ...snap.data(), status }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
