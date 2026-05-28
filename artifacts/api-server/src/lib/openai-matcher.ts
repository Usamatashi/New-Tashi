import OpenAI from "openai";
import { logger } from "./logger";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  client = new OpenAI({ apiKey, timeout: 60000, maxRetries: 1 });
  return client;
}

export type MatcherCandidate = {
  id: number;
  name: string;
  productNumber: string | null;
  vehicleManufacturer: string | null;
  diagramUrl: string;
};

export type MatcherDecision = {
  matchedId: number | null;
  confidence: "high" | "medium" | "low";
  reason: string;
};

/**
 * Asks GPT-4o-mini to compare a brake-pad silhouette against candidate diagrams
 * and pick the best match. Returns null id when no candidate is a confident match.
 */
export async function matchPadWithGPT(
  silhouettePngBase64: string,
  candidates: MatcherCandidate[],
): Promise<MatcherDecision> {
  if (candidates.length === 0) {
    return { matchedId: null, confidence: "low", reason: "No candidate diagrams supplied to GPT matcher." };
  }

  const labeled = candidates.map((c, i) => ({
    ...c,
    label: String.fromCharCode(65 + i),
  }));

  const labelList = labeled
    .map((c) => `${c.label}: ${c.name}${c.productNumber ? ` (#${c.productNumber})` : ""}`)
    .join("\n");

  const instructions =
    "You are a brake-pad shape matcher. " +
    "The FIRST image is a silhouette / outline extracted from a photograph of a worn brake pad. " +
    "The remaining images are reference DIAGRAMS from the catalog, labeled A, B, C, ... " +
    "Your job: pick the diagram whose overall shape, profile and mounting-hole layout best matches the silhouette. " +
    "Compare outline curvature, edge shape, ear/tab positions, and any visible hole or notch positions. " +
    "Ignore color, texture, scratches, dirt and lighting. " +
    "If no diagram is a clear match, reply with label 'none'. " +
    'Respond with ONLY a compact JSON object: {"label":"A"|"B"|...|"none","confidence":"high"|"medium"|"low","reason":"short explanation"}.\n\n' +
    `Candidate diagrams:\n${labelList}`;

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: instructions },
    { type: "text", text: "SCANNED PAD SILHOUETTE:" },
    {
      type: "image_url",
      image_url: { url: `data:image/png;base64,${silhouettePngBase64}`, detail: "high" },
    },
  ];

  for (const c of labeled) {
    content.push({ type: "text", text: `Reference ${c.label}:` });
    content.push({ type: "image_url", image_url: { url: c.diagramUrl, detail: "high" } });
  }

  const openai = getClient();
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content }],
    response_format: { type: "json_object" },
    max_tokens: 200,
    temperature: 0,
  });

  const raw = resp.choices[0]?.message?.content ?? "{}";
  let parsed: { label?: string; confidence?: string; reason?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.warn({ raw }, "GPT matcher returned non-JSON response");
    return { matchedId: null, confidence: "low", reason: "AI returned an unreadable response." };
  }

  const label = (parsed.label ?? "").toString().trim().toUpperCase();
  const reason = (parsed.reason ?? "").toString().slice(0, 240);
  const confidenceRaw = (parsed.confidence ?? "").toString().toLowerCase();
  const confidence: "high" | "medium" | "low" =
    confidenceRaw === "high" ? "high" : confidenceRaw === "medium" ? "medium" : "low";

  if (label === "NONE" || label === "") {
    return { matchedId: null, confidence: "low", reason: reason || "AI did not find a confident match." };
  }

  const picked = labeled.find((c) => c.label === label);
  if (!picked) {
    return { matchedId: null, confidence: "low", reason: `AI returned unknown label "${label}".` };
  }

  return { matchedId: picked.id, confidence, reason: reason || "AI selected this diagram as the best shape match." };
}
