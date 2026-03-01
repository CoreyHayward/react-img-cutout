/**
 * Contour-tracing utilities for extracting polygon outlines from alpha data.
 *
 * Used by the trace effect to render image cutouts with the same SVG
 * stroke-dasharray animation that geometric shapes use.
 *
 * Pipeline:
 * 1. Downscale alpha buffer to a working resolution for performance
 * 2. Build binary grid from alpha threshold
 * 3. Trace the outer boundary using Moore-Neighbor contour tracing
 * 4. Simplify with Ramer–Douglas–Peucker
 * 5. Return normalized [0-1] coordinate pairs
 */

/** Maximum dimension (width or height) of the working grid. */
const WORK_SIZE = 200

/**
 * Perpendicular distance from point `p` to the line segment `a→b`.
 */
function perpendicularDist(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
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
 * Ramer–Douglas–Peucker polyline simplification.
 */
function rdpSimplify(
  pts: [number, number][],
  epsilon: number
): [number, number][] {
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
 * Moore-Neighbor contour tracing on a binary grid.
 *
 * Starts from the topmost-leftmost opaque cell and follows the boundary
 * clockwise, returning an ordered list of grid-cell coordinates.
 */
function mooreTrace(
  grid: Uint8Array,
  w: number,
  h: number
): [number, number][] {
  // Find the start pixel: first opaque cell scanning top→bottom, left→right
  let startX = -1
  let startY = -1
  outer: for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y * w + x]) {
        startX = x
        startY = y
        break outer
      }
    }
  }
  if (startX < 0) return []

  // 8-connected neighbor offsets (clockwise from east)
  //   0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE
  const dx = [1, 1, 0, -1, -1, -1, 0, 1]
  const dy = [0, 1, 1, 1, 0, -1, -1, -1]

  const contour: [number, number][] = []
  let cx = startX
  let cy = startY
  // We entered the start pixel from the west (direction index 4),
  // so begin scanning from the cell we came from: backtrack direction = 4,
  // then start checking from (backtrack + 1) mod 8 = 5.
  let dir = 5

  const maxIter = w * h * 4 // safety limit
  let iter = 0

  do {
    contour.push([cx, cy])
    let found = false

    for (let i = 0; i < 8; i++) {
      const d = (dir + i) % 8
      const nx = cx + dx[d]
      const ny = cy + dy[d]
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny * w + nx]) {
        cx = nx
        cy = ny
        // Backtrack direction: (d + 4) mod 8, start next scan from (backtrack + 1) mod 8
        dir = ((d + 4) % 8 + 1) % 8
        found = true
        break
      }
    }

    if (!found) break
    if (++iter > maxIter) break
  } while (cx !== startX || cy !== startY)

  return contour
}

/**
 * Extract a simplified polygon contour from a pre-computed alpha buffer.
 *
 * Accepts the alpha data already extracted by the hit-test strategy,
 * avoiding a redundant image load.
 *
 * @param alpha          Compact alpha buffer (one byte per pixel)
 * @param srcW           Source image width in pixels
 * @param srcH           Source image height in pixels
 * @param alphaThreshold Minimum alpha value (0-255) to consider opaque
 * @param epsilon        RDP simplification tolerance in normalized coords
 *                       (default: 0.003 — roughly 0.3 % of image size)
 */
export function traceContour(
  alpha: Uint8Array,
  srcW: number,
  srcH: number,
  alphaThreshold = 30,
  epsilon = 0.003
): [number, number][] {
  if (srcW <= 0 || srcH <= 0 || alpha.length === 0) return []

  // --- Downscale to work resolution --------------------------------
  const scale = Math.min(1, WORK_SIZE / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  // --- Binary grid from alpha (with nearest-neighbor downscale) -----
  const grid = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const srcY = Math.min(srcH - 1, Math.floor(y / scale))
    for (let x = 0; x < w; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(x / scale))
      grid[y * w + x] = alpha[srcY * srcW + srcX] > alphaThreshold ? 1 : 0
    }
  }

  // --- Trace outer contour -----------------------------------------
  const raw = mooreTrace(grid, w, h)
  if (raw.length < 3) return []

  // --- Normalize to 0-1 --------------------------------------------
  const normalized: [number, number][] = raw.map(([x, y]) => [
    (x + 0.5) / w,
    (y + 0.5) / h,
  ])

  // --- Simplify -----------------------------------------------------
  const simplified = rdpSimplify(normalized, epsilon)
  return simplified.length >= 3 ? simplified : normalized
}
