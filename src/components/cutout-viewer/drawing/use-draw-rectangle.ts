"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface UseDrawRectangleOptions {
  /** Called when the user finishes drawing a rectangle */
  onComplete: (bounds: { x: number; y: number; w: number; h: number }) => void
  /** Minimum size (width or height) required to complete a rectangle (default: 0.01) */
  minSize?: number
}

export interface UseDrawRectangleReturn {
  /** The in-progress rectangle, or null when not dragging */
  rect: { x: number; y: number; w: number; h: number } | null
  /** True while the user is dragging */
  isDragging: boolean
  /** Reset (cancel) the current in-progress drawing */
  reset: () => void
  /** Ref to attach to the drawing container element */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Event handlers to spread onto the drawing container element */
  containerProps: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerLeave: () => void
  }
}

export function useDrawRectangle({
  onComplete,
  minSize = 0.01,
}: UseDrawRectangleOptions): UseDrawRectangleReturn {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const getNormalized = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = containerRef.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      const nx = (clientX - r.left) / r.width
      const ny = (clientY - r.top) / r.height
      return {
        x: Math.max(0, Math.min(1, nx)),
        y: Math.max(0, Math.min(1, ny)),
      }
    },
    []
  )

  const buildRect = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const x = Math.min(start.x, end.x)
      const y = Math.min(start.y, end.y)
      const w = Math.abs(end.x - start.x)
      const h = Math.abs(end.y - start.y)
      return { x, y, w, h }
    },
    []
  )

  const reset = useCallback(() => {
    setStartPoint(null)
    setRect(null)
  }, [])

  // ESC key cancels
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") reset()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [reset])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      const pos = getNormalized(e.clientX, e.clientY)
      if (!pos) return
      setStartPoint(pos)
      setRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
    },
    [getNormalized]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!startPoint) return
      const pos = getNormalized(e.clientX, e.clientY)
      if (!pos) return
      setRect(buildRect(startPoint, pos))
    },
    [startPoint, getNormalized, buildRect]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!startPoint) return
      const pos = getNormalized(e.clientX, e.clientY)
      if (pos) {
        const r = buildRect(startPoint, pos)
        if (r.w >= minSize && r.h >= minSize) {
          onComplete(r)
        }
      }
      setStartPoint(null)
      setRect(null)
    },
    [startPoint, getNormalized, buildRect, minSize, onComplete]
  )

  const handlePointerLeave = useCallback(() => {
    // Do nothing — pointer capture keeps the drag alive outside the container
  }, [])

  return {
    rect,
    isDragging: startPoint !== null,
    reset,
    containerRef,
    containerProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
    },
  }
}
