"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface UseDrawCircleOptions {
  /** Called when the user finishes drawing a circle */
  onComplete: (circle: { center: { x: number; y: number }; radius: number }) => void
  /** Minimum radius required to complete a circle (default: 0.01) */
  minRadius?: number
}

export interface UseDrawCircleReturn {
  /** The in-progress circle, or null when not dragging */
  circle: { center: { x: number; y: number }; radius: number } | null
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

export function useDrawCircle({
  onComplete,
  minRadius = 0.01,
}: UseDrawCircleOptions): UseDrawCircleReturn {
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null)
  const [circle, setCircle] = useState<{ center: { x: number; y: number }; radius: number } | null>(null)
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

  const reset = useCallback(() => {
    setCenter(null)
    setCircle(null)
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
      setCenter(pos)
      setCircle({ center: pos, radius: 0 })
    },
    [getNormalized]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!center) return
      const pos = getNormalized(e.clientX, e.clientY)
      if (!pos) return
      const dx = pos.x - center.x
      const dy = pos.y - center.y
      const radius = Math.sqrt(dx * dx + dy * dy)
      setCircle({ center, radius })
    },
    [center, getNormalized]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!center) return
      const pos = getNormalized(e.clientX, e.clientY)
      if (pos) {
        const dx = pos.x - center.x
        const dy = pos.y - center.y
        const radius = Math.sqrt(dx * dx + dy * dy)
        if (radius >= minRadius) {
          onComplete({ center, radius })
        }
      }
      setCenter(null)
      setCircle(null)
    },
    [center, getNormalized, minRadius, onComplete]
  )

  const handlePointerLeave = useCallback(() => {
    // Do nothing — pointer capture keeps the drag alive outside the container
  }, [])

  return {
    circle,
    isDragging: center !== null,
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
