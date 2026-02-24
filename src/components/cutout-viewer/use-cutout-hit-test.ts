"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"

export interface CutoutImage {
  id: string
  src: string
  label?: string
}

/**
 * Normalized bounding box (0-1 range) of the opaque pixels in a cutout.
 * Values represent fractions of the image dimensions.
 */
export interface CutoutBounds {
  /** Left edge as a fraction of image width (0-1) */
  x: number
  /** Top edge as a fraction of image height (0-1) */
  y: number
  /** Width as a fraction of image width (0-1) */
  w: number
  /** Height as a fraction of image height (0-1) */
  h: number
}

interface AlphaMap {
  id: string
  /** Pre-extracted alpha channel — one byte per pixel */
  alpha: Uint8Array
  width: number
  height: number
  bounds: CutoutBounds
}

/**
 * Extracts the alpha channel from RGBA image data into a compact Uint8Array
 * (one byte per pixel). This avoids keeping the full canvas alive and enables
 * O(1) lookups during hit testing instead of per-event getImageData calls.
 */
function extractAlpha(data: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const alpha = new Uint8Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    alpha[i] = data[i * 4 + 3]
  }
  return alpha
}

/**
 * Scans a pre-extracted alpha buffer to find the bounding box of pixels whose
 * alpha exceeds the given threshold. Returns normalized (0-1) coordinates.
 */
function computeBounds(
  alpha: Uint8Array,
  w: number,
  h: number,
  threshold: number
): CutoutBounds {
  if (w <= 0 || h <= 0) return { x: 0, y: 0, w: 1, h: 1 }
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0
  let found = false

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        found = true
      }
    }
  }

  if (!found) return { x: 0, y: 0, w: 1, h: 1 }
  return {
    x: minX / w,
    y: minY / h,
    w: (maxX - minX + 1) / w,
    h: (maxY - minY + 1) / h,
  }
}

/**
 * Hook that performs pixel-level alpha hit-testing on a stack of transparent
 * cutout images. Returns the currently-hovered/selected cutout id, computed
 * bounding boxes, and mouse/click handlers for the container.
 *
 * Supports click-to-lock: clicking a cutout "selects" it, holding the active
 * state until the user clicks away from any cutout.
 */
export function useCutoutHitTest(
  cutouts: CutoutImage[],
  enabled = true,
  alphaThreshold = 30,
  hoverLeaveDelay = 150
) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const alphaMapsRef = useRef<AlphaMap[]>([])
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

  // Stabilize cutouts array by serialized key so we don't rebuild alpha maps
  // when the array reference changes but the content is identical.
  const cutoutsKey = cutouts.map((c) => `${c.id}:${c.src}`).join("|")
  const stableCutouts = useMemo(() => cutouts, [cutoutsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build offscreen canvases + bounding boxes for each cutout
  useEffect(() => {
    if (!enabled) {
      alphaMapsRef.current = []
      return
    }

    let cancelled = false

    async function buildAlphaMaps() {
      const maps: AlphaMap[] = []
      const newBoundsMap: Record<string, CutoutBounds> = {}

      for (const cutout of stableCutouts) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.src = cutout.src

        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })

        if (cancelled) return

        const offscreen = document.createElement("canvas")
        offscreen.width = img.naturalWidth
        offscreen.height = img.naturalHeight
        if (offscreen.width <= 0 || offscreen.height <= 0) continue
        const ctx = offscreen.getContext("2d", { willReadFrequently: true })
        if (!ctx) continue

        let bounds: CutoutBounds = { x: 0, y: 0, w: 1, h: 1 }
        let alphaBuffer: Uint8Array
        try {
          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(
            0,
            0,
            img.naturalWidth,
            img.naturalHeight
          )
          const pixelCount = img.naturalWidth * img.naturalHeight
          alphaBuffer = extractAlpha(imageData.data, pixelCount)
          bounds = computeBounds(
            alphaBuffer,
            img.naturalWidth,
            img.naturalHeight,
            clampThreshold
          )
        } catch {
          // Ignore images we cannot read (e.g. CORS-tainted canvas) and
          // leave their bounds as the full image fallback.
          alphaBuffer = new Uint8Array(0)
        }

        maps.push({
          id: cutout.id,
          alpha: alphaBuffer,
          width: img.naturalWidth,
          height: img.naturalHeight,
          bounds,
        })
        newBoundsMap[cutout.id] = bounds
      }

      if (!cancelled) {
        alphaMapsRef.current = maps
        setBoundsMap(newBoundsMap)
      }
    }

    buildAlphaMaps()
    return () => {
      cancelled = true
    }
  }, [stableCutouts, enabled, clampThreshold])

  /** Check which cutout (if any) is under a normalized (0-1) position */
  const hitTestAt = useCallback(
    (nx: number, ny: number): string | null => {
      const maps = alphaMapsRef.current
      for (let i = maps.length - 1; i >= 0; i--) {
        const map = maps[i]
        // Fast-reject: skip pixel lookup if pointer is outside bounding box
        const b = map.bounds
        if (nx < b.x || nx > b.x + b.w || ny < b.y || ny > b.y + b.h) {
          continue
        }
        const px = Math.min(map.width - 1, Math.max(0, Math.floor(nx * map.width)))
        const py = Math.min(
          map.height - 1,
          Math.max(0, Math.floor(ny * map.height))
        )
        // O(1) array lookup instead of per-event getImageData call
        if (map.alpha[py * map.width + px] > clampThreshold) {
          return map.id
        }
      }
      return null
    },
    [clampThreshold]
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
