"use client"

import type {
  CutoutBounds,
  HitTestStrategy,
  CircleCutoutDefinition,
} from "../../hit-test-strategy"

export class CircleHitTestStrategy implements HitTestStrategy {
  id: string
  bounds: CutoutBounds
  private cx: number
  private cy: number
  private r: number

  constructor(def: CircleCutoutDefinition) {
    this.id = def.id
    this.cx = def.center.x
    this.cy = def.center.y
    this.r = def.radius

    // Pre-compute AABB bounding box from center + radius
    this.bounds = {
      x: def.center.x - def.radius,
      y: def.center.y - def.radius,
      w: def.radius * 2,
      h: def.radius * 2,
    }
  }

  hitTest(nx: number, ny: number): boolean {
    const dx = nx - this.cx
    const dy = ny - this.cy
    return dx * dx + dy * dy <= this.r * this.r
  }
}
