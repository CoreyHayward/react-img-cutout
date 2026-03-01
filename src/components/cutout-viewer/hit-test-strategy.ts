"use client"

import { ImageHitTestStrategy } from "./cutouts/image/image-hit-test-strategy"
import { RectHitTestStrategy } from "./cutouts/bbox/bbox-hit-test-strategy"
import { PolygonHitTestStrategy } from "./cutouts/polygon/polygon-hit-test-strategy"

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

// Cutout definition types

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

// Hit-test strategy interface

export interface HitTestStrategy {
  /** Cutout identifier */
  id: string
  /** Returns true if the normalized point (nx, ny) in [0,1] is inside this cutout */
  hitTest(nx: number, ny: number): boolean
  /** Pre-computed bounding box (normalized 0-1) */
  bounds: CutoutBounds
  /** Pre-computed contour polygon (normalized 0-1), if available */
  contour?: [number, number][]
  /** Optional async setup (e.g., image loading) */
  prepare?(): Promise<void>
  /** Cleanup */
  dispose?(): void
}

export { ImageHitTestStrategy } from "./cutouts/image/image-hit-test-strategy"
export { RectHitTestStrategy } from "./cutouts/bbox/bbox-hit-test-strategy"
export { PolygonHitTestStrategy } from "./cutouts/polygon/polygon-hit-test-strategy"

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
