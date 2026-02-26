"use client"

import type {
  CutoutBounds,
  HitTestStrategy,
  ImageCutoutDefinition,
} from "../../hit-test-strategy"

/**
 * Extracts just the alpha (opacity) channel from raw RGBA pixel data.
 *
 * Canvas image data is stored as a flat array of bytes in RGBA order:
 *   [R0, G0, B0, A0, R1, G1, B1, A1, R2, G2, B2, A2, ...]
 *    0   1   2   3   4   5   6   7   8   9   10  11
 *
 * Every 4th byte (index 3, 7, 11, …) is the alpha value for that pixel.
 * This function pulls out only those alpha bytes into a compact array —
 * one byte per pixel — so we can do fast lookups later without keeping
 * the full (4× larger) RGBA buffer around.
 *
 * @param data       - the raw RGBA pixel data from canvas `getImageData()`
 * @param pixelCount - total number of pixels (width × height)
 * @returns a Uint8Array where `result[i]` is the alpha value of pixel `i`
 */
function extractAlpha(data: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const alpha = new Uint8Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    // Grab every 4th byte (the alpha channel) from the RGBA data
    alpha[i] = data[i * 4 + 3]
  }
  return alpha
}

/**
 * Finds the smallest rectangle that contains all non-transparent pixels.
 *
 * It scans every pixel in the alpha buffer and tracks the most extreme
 * positions (top, bottom, left, right) where a pixel's alpha value exceeds
 * the threshold. The result is the tight bounding box around the visible
 * (non-transparent) region of the image.
 *
 * The returned coordinates are **normalized** (0-1) so they can be
 * compared directly against normalized mouse positions without knowing
 * the actual pixel dimensions of the image.
 *
 * If the image is completely transparent (no pixel exceeds the threshold),
 * the bounding box defaults to the full image area (0, 0, 1, 1).
 *
 * @param alpha     - compact alpha buffer (one byte per pixel)
 * @param w         - image width in pixels
 * @param h         - image height in pixels
 * @param threshold - minimum alpha value (0-255) for a pixel to count as
 *                    "visible". Pixels at or below this value are treated
 *                    as transparent.
 * @returns normalized bounding box { x, y, w, h } with values in 0-1
 */
function computeBoundsFromAlpha(
  alpha: Uint8Array,
  w: number,
  h: number,
  threshold: number
): CutoutBounds {
  if (w <= 0 || h <= 0) return { x: 0, y: 0, w: 1, h: 1 }
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0
  let found = false

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        found = true
      }
    }
  }

  // No visible pixels found — fall back to the full image area
  if (!found) return { x: 0, y: 0, w: 1, h: 1 }

  // Convert pixel coordinates to normalized 0-1 range
  return {
    x: minX / w,
    y: minY / h,
    w: (maxX - minX + 1) / w,
    h: (maxY - minY + 1) / h,
  }
}

/**
 * Hit-test strategy for image-based (alpha mask) cutouts.
 *
 * Instead of using geometric shapes, this strategy detects whether the cursor
 * is over a **visible (non-transparent) pixel** in a cutout image. This is
 * useful for irregularly shaped cutouts where polygons would be too complex.
 *
 * Overall flow:
 * 1. **prepare()** — loads the cutout image, draws it onto an offscreen canvas,
 *    reads the pixel data, and extracts just the alpha channel into a compact
 *    buffer. It also computes a tight bounding box around the visible pixels.
 * 2. **hitTest(nx, ny)** — given a normalized mouse position (0-1), first does
 *    a cheap bounding-box check, then looks up the exact pixel in the alpha
 *    buffer to decide if the point is over a visible part of the image.
 */
export class ImageHitTestStrategy implements HitTestStrategy {
  id: string
  bounds: CutoutBounds = { x: 0, y: 0, w: 1, h: 1 }

  /** URL of the cutout mask image */
  private src: string
  /** Alpha value (0-255) a pixel must exceed to be considered "visible" */
  private threshold: number
  /** Pre-extracted alpha channel — one byte per pixel, for fast lookups */
  private alpha: Uint8Array = new Uint8Array(0)
  /** Source image dimensions (pixels) — needed to map normalized coords to pixel indices */
  private width = 0
  private height = 0

  constructor(def: ImageCutoutDefinition, threshold: number) {
    this.id = def.id
    this.src = def.src
    this.threshold = threshold
  }

  /**
   * Loads the cutout image and pre-computes the alpha buffer + bounding box.
   *
   * Steps:
   * 1. Create an <img> element and wait for it to load.
   * 2. Draw the image onto a temporary offscreen <canvas>.
   * 3. Read the raw RGBA pixel data from the canvas.
   * 4. Extract only the alpha channel into a compact buffer (see `extractAlpha`).
   * 5. Compute the tight bounding box of visible pixels (see `computeBoundsFromAlpha`).
   *
   * If the canvas is CORS-tainted (image from a different origin without proper
   * headers), reading pixel data will throw. In that case we fall back to an
   * empty alpha buffer, which means hitTest will always return false.
   */
  async prepare(): Promise<void> {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = this.src

    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })

    const w = img.naturalWidth
    const h = img.naturalHeight
    if (w <= 0 || h <= 0) return

    // Create a temporary canvas to draw the image and read its pixels
    const offscreen = document.createElement("canvas")
    offscreen.width = w
    offscreen.height = h
    const ctx = offscreen.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    try {
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, w, h)
      this.alpha = extractAlpha(imageData.data, w * h)
      this.width = w
      this.height = h
      this.bounds = computeBoundsFromAlpha(this.alpha, w, h, this.threshold)
    } catch {
      // CORS-tainted canvas — leave bounds as full image fallback
      this.alpha = new Uint8Array(0)
    }
  }

  /**
   * Tests whether the normalized point (nx, ny) is over a visible pixel.
   *
   * Three-phase approach:
   * 1. **Alpha buffer check** — if the buffer is empty (image failed to load or
   *    was CORS-tainted), return false immediately.
   * 2. **Bounding-box check** — reject points outside the pre-computed AABB of
   *    visible pixels (very cheap).
   * 3. **Per-pixel alpha lookup** — convert the normalized coordinates to pixel
   *    indices, look up the alpha value in the pre-extracted buffer, and compare
   *    it against the threshold.
   *
   * @param nx - normalized x-coordinate (0-1, relative to the image width)
   * @param ny - normalized y-coordinate (0-1, relative to the image height)
   */
  hitTest(nx: number, ny: number): boolean {
    if (this.alpha.length === 0) return false

    // Quick rejection: point is outside the bounding box of visible pixels
    const b = this.bounds
    if (nx < b.x || nx > b.x + b.w || ny < b.y || ny > b.y + b.h) return false

    // Convert normalized (0-1) coordinates to pixel indices, clamped to image bounds
    const px = Math.min(this.width - 1, Math.max(0, Math.floor(nx * this.width)))
    const py = Math.min(
      this.height - 1,
      Math.max(0, Math.floor(ny * this.height))
    )

    // Look up the alpha value for this pixel and check against the threshold
    return this.alpha[py * this.width + px] > this.threshold
  }
}
