"use client"

import {
  createContext,
  useContext,
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
  type CutoutImage,
  type CutoutBounds,
} from "./use-cutout-hit-test"
import {
  hoverEffects,
  type HoverEffect,
  type HoverEffectPreset,
} from "./hover-effects"
import { CutoutContext, type CutoutContextValue } from "./cutout-context"

/* ------------------------------------------------------------------ */
/*  Placement types                                                    */
/* ------------------------------------------------------------------ */

export type Placement =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

/* ------------------------------------------------------------------ */
/*  Registry context (internal)                                        */
/* ------------------------------------------------------------------ */

interface CutoutRegistryContextValue {
  registerCutout: (id: string, src: string, label?: string) => void
  unregisterCutout: (id: string) => void
}

const CutoutRegistryContext =
  createContext<CutoutRegistryContextValue | null>(null)

/* ------------------------------------------------------------------ */
/*  Viewer context (shared state for all children)                     */
/* ------------------------------------------------------------------ */

interface CutoutViewerContextValue {
  activeId: string | null
  selectedId: string | null
  hoveredId: string | null
  effect: HoverEffect
  enabled: boolean
  showAll: boolean
  boundsMap: Record<string, CutoutBounds>
  isAnyActive: boolean
}

const CutoutViewerContext = createContext<CutoutViewerContextValue | null>(null)

function useCutoutViewerContext() {
  const ctx = useContext(CutoutViewerContext)
  if (!ctx) throw new Error("Must be used inside <CutoutViewer>")
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

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
  effect: effectProp = "apple",
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
      ? (hoverEffects[effectProp] ?? hoverEffects.apple)
      : effectProp

  /* --- Cutout registration ---------------------------------------- */
  const [cutoutMap, setCutoutMap] = useState<
    Map<string, { src: string; label?: string }>
  >(() => new Map())

  const registerCutout = useCallback(
    (id: string, src: string, label?: string) => {
      setCutoutMap((prev) => {
        const existing = prev.get(id)
        if (existing && existing.src === src && existing.label === label) {
          return prev // no change
        }
        const next = new Map(prev)
        next.set(id, { src, label })
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

  // Derive CutoutImage[] from the registry for the hit-test hook
  const cutouts: CutoutImage[] = useMemo(() => {
    const arr: CutoutImage[] = []
    cutoutMap.forEach((val, id) => {
      arr.push({ id, src: val.src, label: val.label })
    })
    return arr
  }, [cutoutMap])

  /* --- Hit testing ------------------------------------------------ */
  const { activeId, selectedId, hoveredId, boundsMap, containerRef, containerProps } =
    useCutoutHitTest(cutouts, enabled, alphaThreshold, hoverLeaveDelay)

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

/* ------------------------------------------------------------------ */
/*  Cutout sub-component                                               */
/* ------------------------------------------------------------------ */

export interface CutoutProps {
  /** Unique identifier for this cutout */
  id: string
  /** URL of the cutout image (transparent PNG, same resolution as mainImage) */
  src: string
  /** Human-readable label */
  label?: string
  /** Override the viewer-level hover effect for this specific cutout */
  effect?: HoverEffectPreset | HoverEffect
  /** Children rendered inside this cutout's context (e.g. `<Overlay>`) */
  children?: ReactNode
}

function Cutout({ id, src, label, effect: effectOverride, children }: CutoutProps) {
  const registry = useContext(CutoutRegistryContext)
  const viewer = useCutoutViewerContext()

  if (!registry) {
    throw new Error("<CutoutViewer.Cutout> must be used inside <CutoutViewer>")
  }

  /* --- Register / unregister -------------------------------------- */
  useEffect(() => {
    registry.registerCutout(id, src, label)
    return () => registry.unregisterCutout(id)
  }, [id, src, label, registry])

  /* --- Resolve per-cutout effect ---------------------------------- */
  const resolvedEffect = effectOverride
    ? typeof effectOverride === "string"
      ? (hoverEffects[effectOverride] ?? viewer.effect)
      : effectOverride
    : viewer.effect

  /* --- Compute state ---------------------------------------------- */
  const isActive = viewer.activeId === id
  const isHovered = viewer.hoveredId === id
  const isSelected = viewer.selectedId === id

  const defaultBounds: CutoutBounds = { x: 0, y: 0, w: 1, h: 1 }
  const bounds = viewer.boundsMap[id] ?? defaultBounds

  let layerStyle: CSSProperties
  if (!viewer.enabled || (!viewer.isAnyActive && !viewer.showAll)) {
    layerStyle = resolvedEffect.cutoutIdle
  } else if (viewer.showAll || isActive) {
    layerStyle = resolvedEffect.cutoutActive
  } else {
    layerStyle = resolvedEffect.cutoutInactive
  }

  const cutoutCtx: CutoutContextValue = useMemo(
    () => ({
      id,
      label,
      bounds,
      isActive,
      isHovered,
      isSelected,
      effect: resolvedEffect,
    }),
    [id, label, bounds, isActive, isHovered, isSelected, resolvedEffect]
  )

  return (
    <CutoutContext.Provider value={cutoutCtx}>
      {/* Image layer */}
      <div
        data-cutout-id={id}
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: isActive ? 20 : 10,
          transition: resolvedEffect.transition,
          ...layerStyle,
        }}
      >
        <img
          src={src}
          alt={label || id}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            userSelect: "none",
          }}
        />
      </div>

      {/* Children (overlay content) rendered on top */}
      {children}
    </CutoutContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Overlay sub-component                                              */
/* ------------------------------------------------------------------ */

/**
 * Converts a `Placement` value into CSS positioning properties
 * relative to a cutout's bounding box (normalized 0-1 values).
 */
function getPlacementStyle(
  placement: Placement,
  bounds: CutoutBounds
): CSSProperties {
  const { x, y, w, h } = bounds

  // Horizontal
  let left: string
  let translateX: string
  if (placement.includes("left")) {
    left = `${x * 100}%`
    translateX = "0"
  } else if (placement.includes("right")) {
    left = `${(x + w) * 100}%`
    translateX = "-100%"
  } else {
    // center
    left = `${(x + w / 2) * 100}%`
    translateX = "-50%"
  }

  // Vertical
  let top: string
  let translateY: string
  if (placement.startsWith("top")) {
    top = `${y * 100}%`
    translateY = "-100%"
  } else if (placement.startsWith("bottom")) {
    top = `${(y + h) * 100}%`
    translateY = "0"
  } else {
    // center
    top = `${(y + h / 2) * 100}%`
    translateY = "-50%"
  }

  return {
    position: "absolute",
    left,
    top,
    transform: `translate(${translateX}, ${translateY})`,
  }
}

export interface CutoutOverlayProps {
  /**
   * Where to position the overlay relative to the cutout's bounding box.
   * @default "top-center"
   */
  placement?: Placement
  /** Content to render inside the overlay */
  children: ReactNode
  /** Additional className */
  className?: string
  /** Additional inline styles (merged after placement styles) */
  style?: CSSProperties
}

/**
 * Renders custom UI positioned relative to the parent `<CutoutViewer.Cutout>`'s
 * opaque bounding box. The overlay is visible when its cutout is active (hovered
 * or selected), or always visible in `showAll` mode.
 *
 * @example
 * <CutoutViewer.Cutout id="face" src="/face.png" label="Face">
 *   <CutoutViewer.Overlay placement="top-center">
 *     <button>View Profile</button>
 *   </CutoutViewer.Overlay>
 * </CutoutViewer.Cutout>
 */
export function CutoutOverlay({
  placement = "top-center",
  children,
  className = "",
  style,
}: CutoutOverlayProps) {
  const cutoutCtx = useContext(CutoutContext)
  const viewer = useCutoutViewerContext()

  if (!cutoutCtx) {
    throw new Error(
      "<CutoutViewer.Overlay> must be used inside <CutoutViewer.Cutout>"
    )
  }

  const isVisible =
    viewer.enabled && (viewer.showAll || cutoutCtx.isActive)

  const placementStyle = getPlacementStyle(placement, cutoutCtx.bounds)

  return (
    <div
      data-cutout-overlay="true"
      className={className}
      style={{
        zIndex: 30,
        transition: cutoutCtx.effect.transition,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        ...placementStyle,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Attach sub-components for compound pattern                         */
/* ------------------------------------------------------------------ */

type CutoutViewerComponent = ((props: CutoutViewerProps) => ReactElement) & {
  Cutout: typeof Cutout
  Overlay: typeof CutoutOverlay
}

export const CutoutViewer = CutoutViewerBase as CutoutViewerComponent

CutoutViewer.Cutout = Cutout
CutoutViewer.Overlay = CutoutOverlay
