import { Router } from "express";
import { fdb, nextId, toISOString } from "../lib/firebase";
import { uploadBase64ToStorage, deleteFromStorage } from "../lib/storage";
import { requireAuth, requireAdmin } from "../lib/auth";
import { extractSilhouette } from "../lib/image-utils";
import { computeDhash, computeDhashFromUrl, hashSimilarity } from "../lib/hashing";
import { matchPadWithGPT, type MatcherCandidate } from "../lib/openai-matcher";
import { privateCache } from "../lib/cache";
import { paramInt } from "../lib/params";

const router = Router();

const FALLBACK_HIGH = 0.85;
const FALLBACK_MEDIUM = 0.75;
const FALLBACK_MIN_MARGIN = 0.03;

router.get("/", requireAuth, privateCache(120), async (req, res) => {
  try {
    const snap = await fdb.collection("products").orderBy("createdAt", "desc").get();
    res.json(
      snap.docs.map((d) => {
        const p = d.data();
        return {
          id: p.id,
          name: p.name,
          points: p.points,
          salesPrice: p.salesPrice,
          category: p.category,
          productNumber: p.productNumber ?? null,
          vehicleManufacturer: p.vehicleManufacturer ?? null,
          imageUrl: p.imageUrl ?? null,
          diagramUrl: p.diagramUrl ?? null,
          createdAt: toISOString(p.createdAt),
        };
      }),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/identify", requireAuth, async (req, res) => {
  try {
    const { photoBase64 } = req.body;
    if (!photoBase64) {
      res.status(400).json({ error: "photoBase64 is required" });
      return;
    }

    const snap = await fdb.collection("products").get();
    const products = snap.docs.map((d) => d.data());
    const productsWithHashes = products.filter(
      (p) => typeof p.diagramHash === "string" && p.diagramHash.length > 0,
    );

    if (productsWithHashes.length === 0) {
      res.status(422).json({
        error:
          "No product diagrams have visual hashes yet. Run POST /api/products/admin/backfill-embeddings as an admin.",
      });
      return;
    }

    const cleanBase64 = photoBase64.replace(/^data:image\/\w+;base64,/, "");
    const rawPhoto = Buffer.from(cleanBase64, "base64");

    // Step 1: extract a clean silhouette/border of the pad from the photo.
    const silhouette = await extractSilhouette(rawPhoto);

    // Step 2: pre-filter the catalog using a perceptual hash of the silhouette
    // (fast, local, no external API).
    const photoHash = await computeDhash(silhouette);

    const scored = productsWithHashes
      .map((p) => ({
        product: p,
        score: hashSimilarity(photoHash, p.diagramHash as string),
      }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best) {
      res.status(500).json({ error: "Failed to score products" });
      return;
    }

    const CANDIDATE_MIN_SCORE = 0.30;
    const MAX_CANDIDATES = 5;
    const topScored = scored
      .filter((s) => s.score >= CANDIDATE_MIN_SCORE)
      .slice(0, MAX_CANDIDATES);

    const gptCandidates: MatcherCandidate[] = topScored
      .filter((s) => typeof s.product.diagramUrl === "string" && s.product.diagramUrl)
      .map((s) => ({
        id: s.product.id as number,
        name: String(s.product.name ?? ""),
        productNumber: s.product.productNumber ? String(s.product.productNumber) : null,
        vehicleManufacturer: s.product.vehicleManufacturer ? String(s.product.vehicleManufacturer) : null,
        diagramUrl: s.product.diagramUrl as string,
      }));

    // Step 3: ask GPT-4o-mini to pick the best match by comparing the silhouette to candidate diagrams.
    let confidence: "high" | "medium" | "low" = "low";
    let matchedProductId: number | null = null;
    let matchedProduct: Record<string, unknown> | null = null;
    let reason: string;

    if (gptCandidates.length === 0) {
      reason = `No catalog diagrams scored above ${CANDIDATE_MIN_SCORE} (best ${best.score.toFixed(3)}). Please retake the photo with better lighting and angle.`;
    } else {
      try {
        const silhouetteB64 = silhouette.toString("base64");
        const decision = await matchPadWithGPT(silhouetteB64, gptCandidates);

        if (decision.matchedId !== null) {
          const picked = topScored.find((s) => s.product.id === decision.matchedId);
          if (picked) {
            matchedProductId = picked.product.id as number;
            matchedProduct = picked.product;
            confidence = decision.confidence;
            reason = decision.reason || "AI selected this diagram as the best match.";
          } else {
            reason = decision.reason || "AI returned an unknown match.";
          }
        } else {
          reason = decision.reason || "AI did not find a confident match. Please retake the photo or pick from the candidates below.";
        }
      } catch (e: any) {
        req.log.error({ err: e }, "GPT matcher failed, falling back to hash similarity");
        const runnerUp = scored[1];
        const margin = runnerUp ? best.score - runnerUp.score : 1;
        const ambiguous = runnerUp && margin < FALLBACK_MIN_MARGIN;

        if (best.score >= FALLBACK_HIGH && !ambiguous) {
          confidence = "high";
          matchedProductId = best.product.id as number;
          matchedProduct = best.product;
          reason = `Fallback shape match (score ${best.score.toFixed(3)}). AI verifier unavailable.`;
        } else if (best.score >= FALLBACK_MEDIUM && !ambiguous) {
          confidence = "medium";
          matchedProductId = best.product.id as number;
          matchedProduct = best.product;
          reason = `Fallback low-confidence shape match (score ${best.score.toFixed(3)}). AI verifier unavailable, please verify.`;
        } else {
          reason = `AI verifier unavailable and shape similarity too low (best ${best.score.toFixed(3)}). Please retake the photo.`;
        }
      }
    }

    const candidates = topScored.map((s) => ({
      id: s.product.id,
      name: s.product.name,
      points: s.product.points,
      salesPrice: s.product.salesPrice,
      category: s.product.category,
      productNumber: s.product.productNumber ?? null,
      vehicleManufacturer: s.product.vehicleManufacturer ?? null,
      imageUrl: s.product.imageUrl ?? null,
      diagramUrl: s.product.diagramUrl ?? null,
      score: s.score,
    }));

    res.json({
      matchedProductId,
      confidence,
      reason,
      score: best.score,
      product: matchedProduct
        ? {
            id: matchedProduct.id,
            name: matchedProduct.name,
            points: matchedProduct.points,
            salesPrice: matchedProduct.salesPrice,
            category: matchedProduct.category,
            productNumber: matchedProduct.productNumber ?? null,
            vehicleManufacturer: matchedProduct.vehicleManufacturer ?? null,
            imageUrl: matchedProduct.imageUrl ?? null,
            diagramUrl: matchedProduct.diagramUrl ?? null,
          }
        : null,
      candidates,
    });
  } catch (err) {
    req.log.error({ err }, "identify failed");
    res.status(500).json({ error: "Failed to identify pad" });
  }
});

router.post("/admin/backfill-embeddings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await fdb.collection("products").get();
    const products = snap.docs.map((d) => ({ ref: d.ref, data: d.data() }));

    const force = req.body?.force === true;
    const targets = products.filter(
      (p) => p.data.diagramUrl && (force || typeof p.data.diagramHash !== "string" || !p.data.diagramHash),
    );

    let processed = 0;
    let failed = 0;
    const errors: { id: unknown; error: string }[] = [];

    for (const t of targets) {
      try {
        const hash = await computeDhashFromUrl(t.data.diagramUrl);
        await t.ref.update({ diagramHash: hash });
        processed++;
      } catch (e: any) {
        failed++;
        errors.push({ id: t.data.id, error: e?.message ?? String(e) });
      }
    }

    res.json({
      total: targets.length,
      processed,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    req.log.error({ err }, "backfill failed");
    res.status(500).json({ error: "Backfill failed" });
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, points, salesPrice, category, productNumber, vehicleManufacturer, imageBase64, diagramBase64 } = req.body;
    if (!name || points === undefined) {
      res.status(400).json({ error: "Name and points are required" });
      return;
    }
    const id = await nextId("products");
    let imageUrl: string | null = null;
    let diagramUrl: string | null = null;
    let diagramHash: string | null = null;

    if (imageBase64) {
      imageUrl = await uploadBase64ToStorage(imageBase64, `products/${id}/image`);
    }
    if (diagramBase64) {
      diagramUrl = await uploadBase64ToStorage(diagramBase64, `products/${id}/diagram`);
      try {
        const cleanB64 = diagramBase64.replace(/^data:image\/\w+;base64,/, "");
        diagramHash = await computeDhash(Buffer.from(cleanB64, "base64"));
      } catch (e) {
        req.log.error({ err: e }, "Failed to compute diagram hash on create");
      }
    }
    const cat = category || "other";
    const product: Record<string, unknown> = {
      id,
      name,
      points: Number(points),
      salesPrice: Number(salesPrice) || 0,
      category: cat,
      productNumber: cat === "other" ? null : (productNumber ? String(productNumber).trim() : null),
      vehicleManufacturer: cat === "other" ? null : (vehicleManufacturer ? String(vehicleManufacturer).trim() : null),
      imageUrl,
      diagramUrl,
      createdAt: new Date(),
    };
    if (diagramHash) product.diagramHash = diagramHash;
    await fdb.collection("products").doc(String(id)).set(product);
    res.status(201).json({ ...product, createdAt: toISOString(product.createdAt as Date), diagramHash: undefined });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = paramInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    const { name, points, salesPrice, category, productNumber, vehicleManufacturer, imageBase64, diagramBase64 } = req.body;
    if (!name || points === undefined) {
      res.status(400).json({ error: "Name and points are required" });
      return;
    }
    const productRef = fdb.collection("products").doc(String(id));
    const doc = await productRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const cat = category || "other";
    const updateData: Record<string, unknown> = {
      name,
      points: Number(points),
      salesPrice: Number(salesPrice) || 0,
      category: cat,
      productNumber: cat === "other" ? null : (productNumber ? String(productNumber).trim() : null),
      vehicleManufacturer: cat === "other" ? null : (vehicleManufacturer ? String(vehicleManufacturer).trim() : null),
    };
    if (imageBase64 !== undefined) {
      if (imageBase64) {
        await deleteFromStorage(`products/${id}/image`);
        updateData.imageUrl = await uploadBase64ToStorage(imageBase64, `products/${id}/image`);
      } else {
        await deleteFromStorage(`products/${id}/image`);
        updateData.imageUrl = null;
      }
    }
    if (diagramBase64 !== undefined) {
      if (diagramBase64) {
        await deleteFromStorage(`products/${id}/diagram`);
        updateData.diagramUrl = await uploadBase64ToStorage(diagramBase64, `products/${id}/diagram`);
        try {
          const cleanB64 = diagramBase64.replace(/^data:image\/\w+;base64,/, "");
          updateData.diagramHash = await computeDhash(Buffer.from(cleanB64, "base64"));
        } catch (e) {
          req.log.error({ err: e }, "Failed to compute diagram hash on update");
          updateData.diagramHash = null;
        }
      } else {
        await deleteFromStorage(`products/${id}/diagram`);
        updateData.diagramUrl = null;
        updateData.diagramHash = null;
      }
    }
    await productRef.update(updateData);
    const updated = { ...doc.data(), ...updateData };
    res.json({
      id: updated.id,
      name: updated.name,
      points: updated.points,
      salesPrice: updated.salesPrice,
      category: updated.category,
      productNumber: updated.productNumber ?? null,
      vehicleManufacturer: updated.vehicleManufacturer ?? null,
      imageUrl: updated.imageUrl ?? null,
      diagramUrl: updated.diagramUrl ?? null,
      createdAt: toISOString(updated.createdAt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = paramInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    await deleteFromStorage(`products/${id}/image`);
    await deleteFromStorage(`products/${id}/diagram`);
    await fdb.collection("products").doc(String(id)).delete();
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
