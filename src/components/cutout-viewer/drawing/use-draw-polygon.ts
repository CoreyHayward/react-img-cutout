"use client"

import { useState, useCallback, useRef } from "react"

export interface UseDrawPolygonOptions {
  /** Called when the user finishes drawing a polygon */
  onComplete: (points: [number, number][]) => void
  /** Minimum number of points required to complete a polygon (default: 3) */
  minPoints?: number
  /**
   * Normalized (0–1) distance threshold to snap-close the polygon by clicking
   * near the first point (default: 0.03).
   */
  closeThreshold?: number
}

export interface UseDrawPolygonReturn {
  /** Points drawn so far, in normalized 0–1 coordinates */
  points: [number, number][]
  /** Current live cursor preview point, or null when the cursor is outside */
  previewPoint: [number, number] | null
  /** True when the cursor is close enough to the first point to snap-close */
  willClose: boolean
  /** Reset (cancel) the current in-progress drawing */
  reset: () => void
  /** Ref to attach to the drawing container element */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Event handlers to spread onto the drawing container element */
  containerProps: {
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerLeave: () => void
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void
  }
}

/**
 * Headless hook for drawing a freeform polygon on an image.
 *
 * - **Single-click**: add a vertex
 * - **Click near first point** (≥ `minPoints` vertices): snap-close and complete
 * - **Double-click**: complete with the current vertices (removes duplicate from
 *   the second single-click that fired before the `dblclick` event)
 * - **Right-click / context-menu**: remove the last vertex
 *
 * All coordinates are normalized (0–1) so they are independent of the rendered
 * image dimensions, matching the convention used by `PolygonCutout`.
 *
 * @example
 * ```tsx
 * const { points, previewPoint, willClose, reset, containerRef, containerProps } =
 *   useDrawPolygon({ onComplete: (pts) => console.log(pts) })
 *
 * return (
 *   <div ref={containerRef} style={{ position: "relative" }} {...containerProps}>
 *     <img src="/main.png" style={{ width: "100%" }} />
 *   </div>
 * )
 * ```
 */
export function useDrawPolygon({
  onComplete,
  minPoints = 3,
  closeThreshold = 0.03,
}: UseDrawPolygonOptions): UseDrawPolygonReturn {
  const [points, setPoints] = useState<[number, number][]>([])
  const [previewPoint, setPreviewPoint] = useState<[number, number] | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const getNormalized = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const el = containerRef.current
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const nx = (clientX - rect.left) / rect.width
      const ny = (clientY - rect.top) / rect.height
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null
      return [nx, ny]
    },
    []
  )

  const isNearFirst = useCallback(
    (pos: [number, number], pts: [number, number][]): boolean => {
      if (pts.length < minPoints) return false
      const dx = pos[0] - pts[0][0]
      const dy = pos[1] - pts[0][1]
      return Math.sqrt(dx * dx + dy * dy) < closeThreshold
    },
    [minPoints, closeThreshold]
  )

  const complete = useCallback(
    (pts: [number, number][]) => {
      if (pts.length < minPoints) return
      onComplete(pts)
      setPoints([])
      setPreviewPoint(null)
    },
    [onComplete, minPoints]
  )

  const reset = useCallback(() => {
    setPoints([])
    setPreviewPoint(null)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setPreviewPoint(getNormalized(e.clientX, e.clientY))
    },
    [getNormalized]
  )

  const handlePointerLeave = useCallback(() => {
    setPreviewPoint(null)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      const pos = getNormalized(e.clientX, e.clientY)
      if (!pos) return

      setPoints((prev) => {
        // Snap-close when the cursor is near the first point
        if (isNearFirst(pos, prev)) {
          complete(prev)
          return []
        }
        return [...prev, pos]
      })
    },
    [getNormalized, isNearFirst, complete]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      // Two `click` events fired before `dblclick`, so the last point was added
      // twice. Remove the duplicate and complete the polygon.
      setPoints((prev) => {
        const trimmed = prev.slice(0, -1)
        if (trimmed.length >= minPoints) {
          complete(trimmed)
          return []
        }
        return trimmed
      })
    },
    [minPoints, complete]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      // Right-click removes the last vertex
      setPoints((prev) => prev.slice(0, -1))
    },
    []
  )

  const willClose =
    previewPoint !== null && isNearFirst(previewPoint, points)

  return {
    points,
    previewPoint,
    willClose,
    reset,
    containerRef,
    containerProps: {
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      onClick: handleClick,
      onDoubleClick: handleDoubleClick,
      onContextMenu: handleContextMenu,
    },
  }
}
