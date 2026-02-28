"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  type CutoutDefinition,
  type CutoutBounds,
  type HitTestStrategy,
  createHitTestStrategy,
} from "./hit-test-strategy"

// Re-export types for backward compatibility and public API
export type { CutoutBounds } from "./hit-test-strategy"

export type {
  CutoutDefinition,
  ImageCutoutDefinition,
  BoundingBoxCutoutDefinition,
  PolygonCutoutDefinition,
  CircleCutoutDefinition,
  HitTestStrategy,
} from "./hit-test-strategy"

/** @deprecated Use `ImageCutoutDefinition` instead */
export interface CutoutImage {
  id: string
  src: string
  label?: string
}

/** Serializes a CutoutDefinition for stable identity comparison */
function serializeDefinition(def: CutoutDefinition): string {
  switch (def.type) {
    case "image":
      return `${def.id}:image:${def.src}:${def.label ?? ""}`
    case "bbox":
      return `${def.id}:bbox:${def.bounds.x},${def.bounds.y},${def.bounds.w},${def.bounds.h}:${def.label ?? ""}`
    case "polygon":
      return `${def.id}:polygon:${def.points.flat().join(",")}:${def.label ?? ""}`
    case "circle":
      return `${def.id}:circle:${def.center.x},${def.center.y},${def.radius}:${def.label ?? ""}`
  }
}

/**
 * Hook that performs hit-testing on a stack of cutout definitions using
 * pluggable strategies. Returns the currently-hovered/selected cutout id,
 * computed bounding boxes, and pointer handlers for the container.
 *
 * Supports click-to-lock: clicking a cutout "selects" it, holding the active
 * state until the user clicks away from any cutout.
 */
export function useCutoutHitTest(
  definitions: CutoutDefinition[],
  enabled = true,
  alphaThreshold = 30,
  hoverLeaveDelay = 150
) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const strategiesRef = useRef<HitTestStrategy[]>([])
  const [boundsMap, setBoundsMap] = useState<Record<string, CutoutBounds>>({})
  const clampThreshold = Math.min(255, Math.max(0, alphaThreshold))

  const hoverClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleHoverClear = useCallback(() => {
    if (hoverClearTimerRef.current !== null) return // already scheduled
    hoverClearTimerRef.current = setTimeout(() => {
      hoverClearTimerRef.current = null
      setHoveredId(null)
    }, hoverLeaveDelay)
  }, [hoverLeaveDelay])

  const cancelHoverClear = useCallback(() => {
    if (hoverClearTimerRef.current !== null) {
      clearTimeout(hoverClearTimerRef.current)
      hoverClearTimerRef.current = null
    }
  }, [])

  // Stabilize definitions array by serialized key so we don't rebuild strategies
  // when the array reference changes but the content is identical.
  const definitionsKey = definitions.map(serializeDefinition).join("|")
  const stableDefinitions = useMemo(() => definitions, [definitionsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build hit-test strategies + bounding boxes for each cutout
  useEffect(() => {
    if (!enabled) {
      strategiesRef.current = []
      return
    }

    let cancelled = false
    let builtStrategies: HitTestStrategy[] = []

    async function buildStrategies() {
      const strategies: HitTestStrategy[] = []
      const newBoundsMap: Record<string, CutoutBounds> = {}

      for (const def of stableDefinitions) {
        const strategy = createHitTestStrategy(def, clampThreshold)
        if (strategy.prepare) {
          await strategy.prepare()
        }
        if (cancelled) return

        strategies.push(strategy)
        newBoundsMap[strategy.id] = strategy.bounds
      }

      if (!cancelled) {
        builtStrategies = strategies
        strategiesRef.current = strategies
        setBoundsMap(newBoundsMap)
      }
    }

    buildStrategies()
    return () => {
      cancelled = true
      for (const s of builtStrategies) {
        s.dispose?.()
      }
    }
  }, [stableDefinitions, enabled, clampThreshold])

  /** Check which cutout (if any) is under a normalized (0-1) position */
  const hitTestAt = useCallback(
    (nx: number, ny: number): string | null => {
      const strategies = strategiesRef.current
      for (let i = strategies.length - 1; i >= 0; i--) {
        if (strategies[i].hitTest(nx, ny)) {
          return strategies[i].id
        }
      }
      return null
    },
    []
  )

  const getNormalizedPos = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current
      if (!container) return null
      const rect = container.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width
      const ny = (e.clientY - rect.top) / rect.height
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null
      return { nx, ny }
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      const pos = getNormalizedPos(e)
      if (!pos) {
        scheduleHoverClear()
        return
      }
      const hitId = hitTestAt(pos.nx, pos.ny)
      if (hitId === null) {
        // If the pointer is over an overlay element (e.g. a button rendered on
        // top of a cutout), keep the current hover state so the overlay stays
        // visible and interactive.
        const target = e.target as HTMLElement | null
        if (target?.closest('[data-cutout-overlay="true"]')) {
          cancelHoverClear()
          return
        }
        scheduleHoverClear()
        return
      }
      // Hovering a real cutout — cancel any pending clear and update immediately
      cancelHoverClear()
      setHoveredId(hitId)
    },
    [enabled, getNormalizedPos, hitTestAt, scheduleHoverClear, cancelHoverClear]
  )

  const handlePointerLeave = useCallback(() => {
    scheduleHoverClear()
  }, [scheduleHoverClear])

  const handleClick = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return
      const pos = getNormalizedPos(e)
      if (!pos) {
        setSelectedId(null)
        return
      }
      const hitId = hitTestAt(pos.nx, pos.ny)
      // If clicking the already-selected cutout, or clicking empty space, deselect
      if (hitId === selectedId || hitId === null) {
        setSelectedId(null)
      } else {
        setSelectedId(hitId)
      }
    },
    [enabled, getNormalizedPos, hitTestAt, selectedId]
  )

  // The "active" id is the selected one if set, otherwise the hovered one
  const activeId = selectedId ?? hoveredId
  const effectiveBoundsMap = enabled ? boundsMap : {}

  // Clean up any pending hover-clear timer on unmount
  useEffect(() => () => { cancelHoverClear() }, [cancelHoverClear])

  return {
    hoveredId,
    selectedId,
    activeId,
    boundsMap: effectiveBoundsMap,
    containerRef,
    containerProps: {
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      onClick: handleClick,
    },
  }
}
