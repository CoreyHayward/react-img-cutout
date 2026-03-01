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
  private rx: number
  private ry: number

  constructor(
    def: CircleCutoutDefinition,
    viewportWidth = 1,
    viewportHeight = 1
  ) {
    this.id = def.id
    this.cx = def.center.x
    this.cy = def.center.y
    const safeWidth = Math.max(1, viewportWidth)
    const safeHeight = Math.max(1, viewportHeight)
    const minDimension = Math.min(safeWidth, safeHeight)

    this.rx = (def.radius * minDimension) / safeWidth
    this.ry = (def.radius * minDimension) / safeHeight

    // Pre-compute AABB bounding box from center + radius
    this.bounds = {
      x: def.center.x - this.rx,
      y: def.center.y - this.ry,
      w: this.rx * 2,
      h: this.ry * 2,
    }
  }

  hitTest(nx: number, ny: number): boolean {
    if (this.rx <= 0 || this.ry <= 0) return false
    const dx = (nx - this.cx) / this.rx
    const dy = (ny - this.cy) / this.ry
    return dx * dx + dy * dy <= 1
  }
}
