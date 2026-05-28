import sharp from "sharp";

/**
 * Computes a 64-bit perceptual hash (dHash) of an image.
 * Returns a 16-character hex string. Two visually similar images will produce
 * hashes with low Hamming distance.
 */
export async function computeDhash(input: Buffer): Promise<string> {
  const { data } = await sharp(input)
    .rotate()
    .resize(9, 8, { fit: "fill", background: { r: 255, g: 255, b: 255 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hex = "";
  let nibble = 0;
  let bitsInNibble = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = data[y * 9 + x];
      const right = data[y * 9 + x + 1];
      const bit = left > right ? 1 : 0;
      nibble = (nibble << 1) | bit;
      bitsInNibble++;
      if (bitsInNibble === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bitsInNibble = 0;
      }
    }
  }
  return hex;
}

const POPCOUNT = new Uint8Array(16);
for (let i = 0; i < 16; i++) {
  let n = i;
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  POPCOUNT[i] = c;
}

export function hammingDistance(hashA: string, hashB: string): number {
  if (!hashA || !hashB || hashA.length !== hashB.length) return Number.POSITIVE_INFINITY;
  let dist = 0;
  for (let i = 0; i < hashA.length; i++) {
    const a = parseInt(hashA[i], 16);
    const b = parseInt(hashB[i], 16);
    if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
    dist += POPCOUNT[(a ^ b) & 0xf];
  }
  return dist;
}

/** Convert hamming distance into a 0..1 similarity score (1 = identical). */
export function hashSimilarity(hashA: string, hashB: string): number {
  const dist = hammingDistance(hashA, hashB);
  if (!Number.isFinite(dist)) return 0;
  const bits = hashA.length * 4;
  return Math.max(0, 1 - dist / bits);
}

/**
 * Fetches an image from a URL and computes its dHash.
 */
export async function computeDhashFromUrl(url: string): Promise<string> {
  const resp: globalThis.Response = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  return computeDhash(buf);
}
