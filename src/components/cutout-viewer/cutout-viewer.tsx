"use client"

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
  type CSSProperties,
} from "react"
import {
  useCutoutHitTest,
  type CutoutDefinition,
} from "./use-cutout-hit-test"
import {
  hoverEffects,
  ensureEffectKeyframes,
  type HoverEffectPreset,
  type HoverEffect,
} from "./hover-effects"
import {
  CutoutRegistryContext,
  CutoutViewerContext,
  type CutoutViewerContextValue,
} from "./viewer-context"
import { Cutout } from "./cutouts/image/cutout"
import { BBoxCutout } from "./cutouts/bbox/bbox-cutout"
import { PolygonCutout } from "./cutouts/polygon/polygon-cutout"
import { CutoutOverlay } from "./cutouts/cutout-overlay"
import { DrawPolygon } from "./drawing/draw-polygon"

function serializeDefinition(def: CutoutDefinition): string {
  switch (def.type) {
    case "image":
      return `image:${def.src}:${def.label ?? ""}`
    case "bbox":
      return `bbox:${def.bounds.x},${def.bounds.y},${def.bounds.w},${def.bounds.h}:${def.label ?? ""}`
    case "polygon":
      return `polygon:${def.points.flat().join(",")}:${def.label ?? ""}`
  }
}

export interface CutoutViewerProps {
  /** URL of the main background image */
  mainImage: string
  /** Accessible alt text for the main image */
  mainImageAlt?: string
  /** Hover effect preset name or a custom HoverEffect object */
  effect?: HoverEffectPreset | HoverEffect
  /** Whether the hover interaction is enabled (default: true) */
  enabled?: boolean
  /** When true, all cutouts show their active/hovered state simultaneously */
  showAll?: boolean
  /** Minimum alpha value 0-255 for pixel hit-testing (default: 30) */
  alphaThreshold?: number
  /** Delay in ms before the hover state clears after leaving a cutout (default: 150) */
  hoverLeaveDelay?: number
  /**
   * Composable children — use `<CutoutViewer.Cutout>` to declare cutout layers.
   * Other elements are rendered on top of the viewer.
   */
  children?: ReactNode
  /** Additional className on the root container */
  className?: string
  /** Additional inline style on the root container */
  style?: CSSProperties
  /** Callback when a cutout is hovered (not selected) */
  onHover?: (cutoutId: string | null) => void
  /** Callback when a cutout becomes active (hovered or selected) */
  onActiveChange?: (cutoutId: string | null) => void
  /** Callback when a cutout is clicked / selected */
  onSelect?: (cutoutId: string | null) => void
}

function CutoutViewerBase({
  mainImage,
  mainImageAlt = "Main image",
  effect: effectProp = "elevate",
  enabled = true,
  showAll = false,
  alphaThreshold = 30,
  hoverLeaveDelay = 150,
  children,
  className = "",
  style,
  onHover,
  onActiveChange,
  onSelect,
}: CutoutViewerProps) {
  const resolvedEffect =
    typeof effectProp === "string"
      ? (hoverEffects[effectProp] ?? hoverEffects.elevate)
      : effectProp

  /* --- Inject any keyframes the active effect declares ------------ */
  useEffect(() => {
    ensureEffectKeyframes(resolvedEffect)
  }, [resolvedEffect])

  /* --- Cutout registration ---------------------------------------- */
  const [cutoutMap, setCutoutMap] = useState<
    Map<string, CutoutDefinition>
  >(() => new Map())

  const registerCutout = useCallback(
    (def: CutoutDefinition) => {
      setCutoutMap((prev) => {
        const existing = prev.get(def.id)
        if (existing && serializeDefinition(existing) === serializeDefinition(def)) {
          return prev // no change
        }
        const next = new Map(prev)
        next.set(def.id, def)
        return next
      })
    },
    []
  )

  const unregisterCutout = useCallback((id: string) => {
    setCutoutMap((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const registryValue = useMemo(
    () => ({ registerCutout, unregisterCutout }),
    [registerCutout, unregisterCutout]
  )

  // Derive CutoutDefinition[] from the registry for the hit-test hook
  const definitions: CutoutDefinition[] = useMemo(() => {
    return Array.from(cutoutMap.values())
  }, [cutoutMap])

  /* --- Hit testing ------------------------------------------------ */
  const { activeId, selectedId, hoveredId, boundsMap, containerRef, containerProps } =
    useCutoutHitTest(definitions, enabled, alphaThreshold, hoverLeaveDelay)

  /* --- Callbacks via useEffect (correct ref-based approach) ------- */
  const prevHovRef = useRef<string | null>(null)
  const prevActiveRef = useRef<string | null>(null)
  const prevSelRef = useRef<string | null>(null)

  useEffect(() => {
    if (hoveredId !== prevHovRef.current) {
      prevHovRef.current = hoveredId
      onHover?.(hoveredId)
    }
  }, [hoveredId, onHover])

  useEffect(() => {
    if (activeId !== prevActiveRef.current) {
      prevActiveRef.current = activeId
      onActiveChange?.(activeId)
    }
  }, [activeId, onActiveChange])

  useEffect(() => {
    if (selectedId !== prevSelRef.current) {
      prevSelRef.current = selectedId
      onSelect?.(selectedId)
    }
  }, [selectedId, onSelect])

  /* --- Derived state --------------------------------------------- */
  const isAnyActive = showAll || activeId !== null

  const viewerValue: CutoutViewerContextValue = useMemo(
    () => ({
      activeId,
      selectedId,
      hoveredId,
      effect: resolvedEffect,
      enabled,
      showAll,
      boundsMap,
      isAnyActive,
    }),
    [activeId, selectedId, hoveredId, resolvedEffect, enabled, showAll, boundsMap, isAnyActive]
  )

  return (
    <CutoutRegistryContext.Provider value={registryValue}>
      <CutoutViewerContext.Provider value={viewerValue}>
        <div
          ref={containerRef}
          className={className}
          style={{
            position: "relative",
            width: "100%",
            overflow: "hidden",
            cursor: isAnyActive && enabled ? "pointer" : "default",
            ...style,
          }}
          {...containerProps}
        >
          {/* Main background image */}
          <img
            src={mainImage}
            alt={mainImageAlt}
            draggable={false}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              userSelect: "none",
              transition: resolvedEffect.transition,
              ...(isAnyActive && enabled
                ? resolvedEffect.mainImageHovered
                : {}),
            }}
          />

          {/* Vignette overlay */}
          <div
            style={{
              pointerEvents: "none",
              position: "absolute",
              inset: 0,
              transition: resolvedEffect.transition,
              opacity: isAnyActive && enabled ? 1 : 0,
              ...resolvedEffect.vignetteStyle,
            }}
          />

          {/* Children: <Cutout> components + other custom UI */}
          {children}
        </div>
      </CutoutViewerContext.Provider>
    </CutoutRegistryContext.Provider>
  )
}

// Compound component pattern

type CutoutViewerComponent = ((props: CutoutViewerProps) => ReactElement) & {
  Cutout: typeof Cutout
  BBoxCutout: typeof BBoxCutout
  PolygonCutout: typeof PolygonCutout
  Overlay: typeof CutoutOverlay
  DrawPolygon: typeof DrawPolygon
}

export const CutoutViewer = CutoutViewerBase as CutoutViewerComponent

CutoutViewer.Cutout = Cutout
CutoutViewer.BBoxCutout = BBoxCutout
CutoutViewer.PolygonCutout = PolygonCutout
CutoutViewer.Overlay = CutoutOverlay
CutoutViewer.DrawPolygon = DrawPolygon
