"use client"

import type {
  CutoutBounds,
  HitTestStrategy,
  BoundingBoxCutoutDefinition,
} from "../../hit-test-strategy"

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
