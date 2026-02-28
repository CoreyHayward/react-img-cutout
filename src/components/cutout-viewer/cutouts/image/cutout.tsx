"use client"

import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react"
import type { CutoutBounds } from "../../hit-test-strategy"
import {
  hoverEffects,
  type HoverEffect,
  type HoverEffectPreset,
  type TraceConfig,
} from "../../hover-effects"
import { CutoutContext, type CutoutContextValue } from "../cutout-context"
import { CutoutRegistryContext, useCutoutViewerContext } from "../../viewer-context"
import { extractContour } from "./alpha-contour"

export interface RenderLayerProps {
  isActive: boolean
  isHovered: boolean
  isSelected: boolean
  bounds: CutoutBounds
  effect: HoverEffect
}

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
  /** Custom renderer for the cutout layer. When provided, replaces the default `<img>` rendering. */
  renderLayer?: (props: RenderLayerProps) => ReactNode
}

/**
 * Renders the animated trace overlay for image-based cutouts.
 *
 * Extracts a polygon outline from the image alpha channel and renders it
 * as an SVG polygon with the same `stroke-dasharray` + `stroke-dashoffset`
 * animation used on geometric shapes (bbox / polygon).
 */
function TraceOverlay({
  src,
  config,
  active,
  transition,
}: {
  src: string
  config: TraceConfig
  active: boolean
  transition: string
}) {
  const width = config.width ?? 6
  const duration = config.duration ?? 3
  const color = config.color ?? "rgba(255, 255, 255, 0.9)"

  const [contour, setContour] = useState<[number, number][] | null>(null)

  useEffect(() => {
    let cancelled = false
    extractContour(src).then((pts) => {
      if (!cancelled && pts.length >= 3) setContour(pts)
    })
    return () => { cancelled = true }
  }, [src])

  if (!contour) return null

  const pointsStr = contour.map(([x, y]) => `${x},${y}`).join(" ")

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: active ? 1 : 0,
        transition,
      }}
    >
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          filter: `drop-shadow(0 0 ${width}px ${color})`,
        }}
      >
        <polygon
          points={pointsStr}
          fill="rgba(255, 255, 255, 0.03)"
          stroke={color}
          // 0.0015 converts CSS px to the 0-1 SVG viewBox coordinate space,
          // matching the factor used by PolygonCutout and BBoxCutout.
          strokeWidth={width * 0.0015}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="0.15 0.85"
          pathLength={1}
          style={{
            transition,
            animation: `_ricut-trace-stroke ${duration}s linear infinite`,
          }}
        />
      </svg>
    </div>
  )
}

export function Cutout({ id, src, label, effect: effectOverride, children, renderLayer }: CutoutProps) {
  const registry = useContext(CutoutRegistryContext)
  const viewer = useCutoutViewerContext()

  if (!registry) {
    throw new Error("<CutoutViewer.Cutout> must be used inside <CutoutViewer>")
  }

  /* --- Register / unregister -------------------------------------- */
  useEffect(() => {
    registry.registerCutout({ type: "image", id, src, label })
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

  const traceActive =
    viewer.enabled && (viewer.showAll || isActive)

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
      {/* Cutout layer */}
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
        {renderLayer
          ? renderLayer({ isActive, isHovered, isSelected, bounds, effect: resolvedEffect })
          : (
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
          )}

        {/* Animated trace overlay — bright arc sweeping the silhouette edge */}
        {resolvedEffect.traceConfig && (
          <TraceOverlay
            src={src}
            config={resolvedEffect.traceConfig}
            active={traceActive}
            transition={resolvedEffect.transition}
          />
        )}
      </div>

      {/* Children (overlay content) rendered on top */}
      {children}
    </CutoutContext.Provider>
  )
}
