import sharp from "sharp";

/**
 * Extracts a clean silhouette / boundary of the brake pad from a photo.
 * Returns a black-on-white PNG showing only the pad's outline shape,
 * suitable for visual comparison against catalog line diagrams.
 *
 * Pipeline: grayscale + Otsu thresholding + largest-connected-component +
 * boundary tracing.
 */
export async function extractSilhouette(input: Buffer): Promise<Buffer> {
  const SIZE = 512;

  const base = await sharp(input)
    .rotate()
    .resize(SIZE, SIZE, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .grayscale()
    .normalize()
    .blur(1.5)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const data = base.data;
  const info = base.info;
  const w = info.width;
  const h = info.height;

  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) histogram[data[i]]++;

  const total = data.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * histogram[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) {
      maxVar = v;
      threshold = t;
    }
  }

  const cornerSamples: number[] = [];
  const sampleSize = 8;
  for (let y = 0; y < sampleSize; y++) {
    for (let x = 0; x < sampleSize; x++) {
      cornerSamples.push(data[y * w + x]);
      cornerSamples.push(data[y * w + (w - 1 - x)]);
      cornerSamples.push(data[(h - 1 - y) * w + x]);
      cornerSamples.push(data[(h - 1 - y) * w + (w - 1 - x)]);
    }
  }
  const cornerAvg = cornerSamples.reduce((a, b) => a + b, 0) / cornerSamples.length;
  const objectIsDark = cornerAvg > threshold;

  const mask = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const isObject = objectIsDark ? data[i] < threshold : data[i] >= threshold;
    mask[i] = isObject ? 1 : 0;
  }

  const visited = new Uint8Array(mask.length);
  let bestSize = 0;
  let bestComponent: number[] | null = null;
  const queue = new Int32Array(mask.length);

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== 1 || visited[i]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    visited[i] = 1;
    const component: number[] = [];
    while (head < tail) {
      const idx = queue[head++];
      component.push(idx);
      const x = idx % w;
      const y = (idx / w) | 0;
      if (x > 0) {
        const n = idx - 1;
        if (mask[n] === 1 && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
      if (x < w - 1) {
        const n = idx + 1;
        if (mask[n] === 1 && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
      if (y > 0) {
        const n = idx - w;
        if (mask[n] === 1 && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
      if (y < h - 1) {
        const n = idx + w;
        if (mask[n] === 1 && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
    }
    if (component.length > bestSize) {
      bestSize = component.length;
      bestComponent = component;
    }
  }

  const silhouette = new Uint8Array(data.length);
  silhouette.fill(0);
  if (bestComponent) {
    for (const idx of bestComponent) silhouette[idx] = 1;
  }

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    if (silhouette[i] === 0) {
      out[i] = 255;
      continue;
    }
    const x = i % w;
    const y = (i / w) | 0;
    let isEdge = false;
    if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
      isEdge = true;
    } else {
      if (
        silhouette[i - 1] === 0 ||
        silhouette[i + 1] === 0 ||
        silhouette[i - w] === 0 ||
        silhouette[i + w] === 0
      ) {
        isEdge = true;
      }
    }
    out[i] = isEdge ? 0 : 255;
  }

  return sharp(out, { raw: { width: w, height: h, channels: info.channels } })
    .png()
    .toBuffer();
}
