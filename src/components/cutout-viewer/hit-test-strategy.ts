"use client"

/**
 * Normalized bounding box (0-1 range) of the opaque pixels in a cutout.
 * Values represent fractions of the image dimensions.
 */
export interface CutoutBounds {
  /** Left edge as a fraction of image width (0-1) */
  x: number
  /** Top edge as a fraction of image height (0-1) */
  y: number
  /** Width as a fraction of image width (0-1) */
  w: number
  /** Height as a fraction of image height (0-1) */
  h: number
}

/* ------------------------------------------------------------------ */
/*  Cutout definition types (the "what")                               */
/* ------------------------------------------------------------------ */

interface BaseCutoutDefinition {
  id: string
  label?: string
}

export interface ImageCutoutDefinition extends BaseCutoutDefinition {
  type: "image"
  /** Transparent PNG, same resolution as the main image */
  src: string
}

export interface BoundingBoxCutoutDefinition extends BaseCutoutDefinition {
  type: "bbox"
  /** Normalized 0-1 coordinates */
  bounds: { x: number; y: number; w: number; h: number }
}

export interface PolygonCutoutDefinition extends BaseCutoutDefinition {
  type: "polygon"
  /** Array of [x, y] normalized points forming a closed path */
  points: [number, number][]
}

export type CutoutDefinition =
  | ImageCutoutDefinition
  | BoundingBoxCutoutDefinition
  | PolygonCutoutDefinition

/* ------------------------------------------------------------------ */
/*  Hit-test strategy interface (the "how")                            */
/* ------------------------------------------------------------------ */

export interface HitTestStrategy {
  /** Cutout identifier */
  id: string
  /** Returns true if the normalized point (nx, ny) in [0,1] is inside this cutout */
  hitTest(nx: number, ny: number): boolean
  /** Pre-computed bounding box (normalized 0-1) */
  bounds: CutoutBounds
  /** Optional async setup (e.g., image loading) */
  prepare?(): Promise<void>
  /** Cleanup */
  dispose?(): void
}

/* ------------------------------------------------------------------ */
/*  Image hit-test strategy (alpha channel)                            */
/* ------------------------------------------------------------------ */

/**
 * Extracts the alpha channel from RGBA image data into a compact Uint8Array
 * (one byte per pixel). This avoids keeping the full canvas alive and enables
 * O(1) lookups during hit testing instead of per-event getImageData calls.
 */
function extractAlpha(data: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const alpha = new Uint8Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    alpha[i] = data[i * 4 + 3]
  }
  return alpha
}

/**
 * Scans a pre-extracted alpha buffer to find the bounding box of pixels whose
 * alpha exceeds the given threshold. Returns normalized (0-1) coordinates.
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

  if (!found) return { x: 0, y: 0, w: 1, h: 1 }
  return {
    x: minX / w,
    y: minY / h,
    w: (maxX - minX + 1) / w,
    h: (maxY - minY + 1) / h,
  }
}

export class ImageHitTestStrategy implements HitTestStrategy {
  id: string
  bounds: CutoutBounds = { x: 0, y: 0, w: 1, h: 1 }

  private src: string
  private threshold: number
  private alpha: Uint8Array = new Uint8Array(0)
  private width = 0
  private height = 0

  constructor(def: ImageCutoutDefinition, threshold: number) {
    this.id = def.id
    this.src = def.src
    this.threshold = threshold
  }

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

  hitTest(nx: number, ny: number): boolean {
    if (this.alpha.length === 0) return false
    const b = this.bounds
    if (nx < b.x || nx > b.x + b.w || ny < b.y || ny > b.y + b.h) return false
    const px = Math.min(this.width - 1, Math.max(0, Math.floor(nx * this.width)))
    const py = Math.min(
      this.height - 1,
      Math.max(0, Math.floor(ny * this.height))
    )
    return this.alpha[py * this.width + px] > this.threshold
  }
}

/* ------------------------------------------------------------------ */
/*  Rect (bounding box) hit-test strategy                              */
/* ------------------------------------------------------------------ */

export class RectHitTestStrategy implements HitTestStrategy {
  id: string
  bounds: CutoutBounds

  constructor(def: BoundingBoxCutoutDefinition) {
    this.id = def.id
    this.bounds = { ...def.bounds }
  }

  hitTest(nx: number, ny: number): boolean {
    const b = this.bounds
    return nx >= b.x && nx <= b.x + b.w && ny >= b.y && ny <= b.y + b.h
  }
}

/* ------------------------------------------------------------------ */
/*  Polygon hit-test strategy (ray-casting)                            */
/* ------------------------------------------------------------------ */

/** Ray-casting point-in-polygon test */
function pointInPolygon(
  px: number,
  py: number,
  points: [number, number][]
): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0],
      yi = points[i][1]
    const xj = points[j][0],
      yj = points[j][1]
    if (
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    ) {
      inside = !inside
    }
  }
  return inside
}

export class PolygonHitTestStrategy implements HitTestStrategy {
  id: string
  bounds: CutoutBounds
  private points: [number, number][]

  constructor(def: PolygonCutoutDefinition) {
    this.id = def.id
    this.points = def.points
    // Compute bounding rect from polygon points
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const [x, y] of def.points) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    this.bounds = {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    }
  }

  hitTest(nx: number, ny: number): boolean {
    const b = this.bounds
    if (nx < b.x || nx > b.x + b.w || ny < b.y || ny > b.y + b.h) return false
    return pointInPolygon(nx, ny, this.points)
  }
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

export function createHitTestStrategy(
  def: CutoutDefinition,
  alphaThreshold: number
): HitTestStrategy {
  switch (def.type) {
    case "image":
      return new ImageHitTestStrategy(def, alphaThreshold)
    case "bbox":
      return new RectHitTestStrategy(def)
    case "polygon":
      return new PolygonHitTestStrategy(def)
  }
}
