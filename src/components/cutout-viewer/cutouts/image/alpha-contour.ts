/**
 * Contour-tracing utilities for extracting smooth polygon outlines
 * from alpha data.
 *
 * Used by the trace effect to render image cutouts with SVG stroke
 * animations that closely follow the subject silhouette.
 *
 * Pipeline:
 * 1. Downscale alpha buffer to a working resolution for performance
 * 2. Marching Squares with linear interpolation for sub-pixel contours
 * 3. Stitch edge segments into closed loops
 * 4. Simplify with Ramer-Douglas-Peucker
 * 5. Return normalized [0-1] coordinate pairs
 */

/** Maximum dimension (width or height) of the working grid. */
const WORK_SIZE = 400

type Point = [number, number]

/**
 * Perpendicular distance from point `p` to the line segment `a` -> `b`.
 */
function perpendicularDist(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const ex = p[0] - a[0]
    const ey = p[1] - a[1]
    return Math.sqrt(ex * ex + ey * ey)
  }
  const cross = Math.abs(dx * (a[1] - p[1]) - dy * (a[0] - p[0]))
  return cross / Math.sqrt(lenSq)
}

/**
 * Ramer-Douglas-Peucker polyline simplification.
 */
function rdpSimplify(pts: Point[], epsilon: number): Point[] {
  if (pts.length <= 2) return pts

  let maxDist = 0
  let maxIdx = 0
  const first = pts[0]
  const last = pts[pts.length - 1]

  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDist(pts[i], first, last)
    if (d > maxDist) {
      maxDist = d
      maxIdx = i
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(pts.slice(0, maxIdx + 1), epsilon)
    const right = rdpSimplify(pts.slice(maxIdx), epsilon)
    return left.slice(0, -1).concat(right)
  }
  return [first, last]
}

/**
 * Signed area of a polygon (positive = counter-clockwise).
 */
function signedArea(pts: Point[]): number {
  let area = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % n]
    area += x1 * y2 - x2 * y1
  }
  return area * 0.5
}

/**
 * Simplify a closed contour with RDP by temporarily opening it.
 */
function simplifyClosedContour(pts: Point[], epsilon: number): Point[] {
  if (pts.length <= 3 || epsilon <= 0) return pts
  const open = pts.concat([pts[0]])
  const simplified = rdpSimplify(open, epsilon)
  if (simplified.length < 4) return pts
  simplified.pop()
  return simplified.length >= 3 ? simplified : pts
}

// -------------------------------------------------------------------
// Marching Squares
// -------------------------------------------------------------------

/**
 * Segment table for Marching Squares.
 *
 * Corner bit assignment for each 2x2 cell:
 *   bit 0 (1) = top-left,  bit 1 (2) = top-right,
 *   bit 2 (4) = bottom-right,  bit 3 (8) = bottom-left
 *
 * Edge indices: 0=top, 1=right, 2=bottom, 3=left
 */
const SEG_TABLE: [number, number][][] = [
  [],              // 0   (0000)
  [[3, 0]],        // 1   (0001) TL
  [[0, 1]],        // 2   (0010) TR
  [[3, 1]],        // 3   (0011) TL TR
  [[1, 2]],        // 4   (0100) BR
  [[3, 0], [1, 2]],// 5   (0101) TL BR  (saddle)
  [[0, 2]],        // 6   (0110) TR BR
  [[3, 2]],        // 7   (0111) TL TR BR
  [[2, 3]],        // 8   (1000) BL
  [[2, 0]],        // 9   (1001) TL BL
  [[0, 1], [2, 3]],// 10  (1010) TR BL  (saddle)
  [[2, 1]],        // 11  (1011) TL TR BL
  [[1, 3]],        // 12  (1100) BR BL
  [[1, 0]],        // 13  (1101) TL BR BL
  [[0, 3]],        // 14  (1110) TR BR BL
  [],              // 15  (1111)
]

/**
 * Run Marching Squares on a scalar field and return contour segments.
 * Uses linear interpolation along cell edges for sub-pixel accuracy.
 */
function marchingSquaresSegments(
  field: Float32Array,
  w: number,
  h: number,
  threshold: number
): [Point, Point][] {
  const segments: [Point, Point][] = []

  for (let cy = 0; cy < h - 1; cy++) {
    for (let cx = 0; cx < w - 1; cx++) {
      const tl = field[cy * w + cx]
      const tr = field[cy * w + cx + 1]
      const br = field[(cy + 1) * w + cx + 1]
      const bl = field[(cy + 1) * w + cx]

      let caseIdx = 0
      if (tl >= threshold) caseIdx |= 1
      if (tr >= threshold) caseIdx |= 2
      if (br >= threshold) caseIdx |= 4
      if (bl >= threshold) caseIdx |= 8

      if (caseIdx === 0 || caseIdx === 15) continue

      const interp = (edge: number): Point => {
        switch (edge) {
          case 0: { // top: TL -- TR
            const d = tr - tl
            const t = Math.abs(d) < 1e-10 ? 0.5 : Math.max(0, Math.min(1, (threshold - tl) / d))
            return [cx + t, cy]
          }
          case 1: { // right: TR -- BR
            const d = br - tr
            const t = Math.abs(d) < 1e-10 ? 0.5 : Math.max(0, Math.min(1, (threshold - tr) / d))
            return [cx + 1, cy + t]
          }
          case 2: { // bottom: BL -- BR
            const d = br - bl
            const t = Math.abs(d) < 1e-10 ? 0.5 : Math.max(0, Math.min(1, (threshold - bl) / d))
            return [cx + t, cy + 1]
          }
          case 3: { // left: TL -- BL
            const d = bl - tl
            const t = Math.abs(d) < 1e-10 ? 0.5 : Math.max(0, Math.min(1, (threshold - tl) / d))
            return [cx, cy + t]
          }
          default:
            return [cx + 0.5, cy + 0.5]
        }
      }

      for (const [e1, e2] of SEG_TABLE[caseIdx]) {
        segments.push([interp(e1), interp(e2)])
      }
    }
  }

  return segments
}

/**
 * Stitch line segments into closed loops by matching endpoints.
 */
function stitchLoops(segments: [Point, Point][]): Point[][] {
  if (segments.length === 0) return []

  const pk = (p: Point) =>
    `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)}`

  const adj = new Map<string, { idx: number; end: 0 | 1 }[]>()

  for (let i = 0; i < segments.length; i++) {
    for (const end of [0, 1] as const) {
      const k = pk(segments[i][end])
      let list = adj.get(k)
      if (!list) {
        list = []
        adj.set(k, list)
      }
      list.push({ idx: i, end })
    }
  }

  const used = new Uint8Array(segments.length)
  const loops: Point[][] = []

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue

    const loop: Point[] = []
    let curIdx = i
    let curEnd: 0 | 1 = 1
    let guard = 0
    const maxSteps = segments.length + 1

    while (guard++ < maxSteps) {
      if (used[curIdx]) break
      used[curIdx] = 1

      const fromEnd = curEnd === 1 ? 0 : 1
      loop.push(segments[curIdx][fromEnd])

      const toPoint = segments[curIdx][curEnd]
      const k = pk(toPoint)
      const neighbors = adj.get(k)
      if (!neighbors) break

      const next = neighbors.find((n) => !used[n.idx])
      if (!next) break

      curIdx = next.idx
      curEnd = next.end === 0 ? 1 : 0
    }

    if (loop.length >= 3) loops.push(loop)
  }

  return loops
}

// -------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------

/**
 * Extract a smooth polygon contour from a pre-computed alpha buffer
 * using Marching Squares with linear interpolation for sub-pixel accuracy.
 */
export function traceContour(
  alpha: Uint8Array,
  srcW: number,
  srcH: number,
  alphaThreshold = 30,
  epsilon = 0.002
): Point[] {
  if (srcW <= 0 || srcH <= 0 || alpha.length === 0) return []

  const scale = Math.min(1, WORK_SIZE / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  // Padded dimensions (1px border of zeros for proper contour closure)
  const pw = w + 2
  const ph = h + 2

  // Continuous alpha field with zero-padded border
  const field = new Float32Array(pw * ph)
  for (let y = 0; y < h; y++) {
    const srcY = Math.min(srcH - 1, Math.floor(y / scale))
    for (let x = 0; x < w; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(x / scale))
      field[(y + 1) * pw + (x + 1)] = alpha[srcY * srcW + srcX]
    }
  }

  const segments = marchingSquaresSegments(field, pw, ph, alphaThreshold)
  const loops = stitchLoops(segments)
  if (loops.length === 0) return []

  // Keep the largest loop
  let best = loops[0]
  let bestArea = Math.abs(signedArea(best))
  for (let i = 1; i < loops.length; i++) {
    const a = Math.abs(signedArea(loops[i]))
    if (a > bestArea) {
      best = loops[i]
      bestArea = a
    }
  }

  // Normalize to 0-1 (account for 1px padding offset)
  const normalized: Point[] = best.map(([x, y]) => [
    (x - 1) / w,
    (y - 1) / h,
  ])

  const simplified = simplifyClosedContour(normalized, epsilon)
  return simplified.length >= 3 ? simplified : normalized
}

/**
 * Convert a closed contour to a smooth SVG path using
 * Catmull-Rom to Cubic Bezier conversion.
 *
 * Produces curves that pass through every control point with smooth
 * tangent continuity, eliminating the angular straight-line look.
 */
export function contourToSmoothPath(points: Point[]): string {
  const n = points.length
  if (n < 3) return ""

  const parts: string[] = [`M${points[0][0]},${points[0][1]}`]

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]

    // Catmull-Rom -> Cubic Bezier control points (tension = 1)
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6

    parts.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`)
  }

  parts.push("Z")
  return parts.join("")
}
