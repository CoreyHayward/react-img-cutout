"use client"

import type {
  CutoutBounds,
  HitTestStrategy,
  PolygonCutoutDefinition,
} from "../../hit-test-strategy"

/**
 * Determines whether a point (px, py) lies inside a polygon using the
 * **ray-casting algorithm**.
 *
 * How it works:
 * 1. Imagine shooting a horizontal ray from the test point to the right,
 *    extending to infinity.
 * 2. Count how many edges of the polygon this ray crosses.
 * 3. If the ray crosses an **odd** number of edges the point is **inside**;
 *    if it crosses an **even** number (including zero) the point is **outside**.
 *
 * The loop walks every edge of the polygon. For each edge (from vertex i
 * to vertex j) it checks two things:
 *   a) The edge straddles the point's y-coordinate (one vertex above, one
 *      below). This ensures the horizontal ray *could* cross this edge.
 *   b) The x-coordinate where the edge crosses the ray's y-level is to the
 *      **right** of the point. This confirms the ray actually intersects.
 *
 * Each time both conditions are true the `inside` flag is toggled. After
 * all edges are checked the final value tells us if the point is inside.
 *
 * @param px - x-coordinate of the test point (normalized 0-1)
 * @param py - y-coordinate of the test point (normalized 0-1)
 * @param points - ordered vertices of the polygon as [x, y] pairs (normalized 0-1)
 * @returns `true` if (px, py) is inside the polygon
 */
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

    // Does this edge straddle the ray's y-level?
    // And is the intersection point to the right of px?
    if (
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    ) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Hit-test strategy for polygon-shaped cutouts.
 *
 * On construction it pre-computes an axis-aligned bounding box (AABB) from the
 * polygon vertices. During hit testing it first checks the cheap AABB test to
 * quickly reject points that are clearly outside, then falls back to the more
 * expensive ray-casting test only when needed.
 */
export class PolygonHitTestStrategy implements HitTestStrategy {
  id: string
  bounds: CutoutBounds
  private points: [number, number][]

  constructor(def: PolygonCutoutDefinition) {
    this.id = def.id
    this.points = def.points

    // Walk all vertices to find the smallest rectangle that fully contains the
    // polygon. This bounding box is used as a fast early-exit check in hitTest.
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

  /**
   * Tests whether the normalized point (nx, ny) is inside this polygon.
   *
   * Two-phase approach for performance:
   * 1. **Bounding-box check** — if the point is outside the AABB, return false
   *    immediately (very cheap).
   * 2. **Ray-cast check** — run the full point-in-polygon algorithm for precise
   *    hit detection only if the point passed the bounding-box check.
   *
   * @param nx - normalized x-coordinate (0-1, relative to the image width)
   * @param ny - normalized y-coordinate (0-1, relative to the image height)
   */
  hitTest(nx: number, ny: number): boolean {
    const b = this.bounds
    // Quick rejection: point is outside the bounding box
    if (nx < b.x || nx > b.x + b.w || ny < b.y || ny > b.y + b.h) return false
    // Precise test: ray-casting algorithm
    return pointInPolygon(nx, ny, this.points)
  }
}
