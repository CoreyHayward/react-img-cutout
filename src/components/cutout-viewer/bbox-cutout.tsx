"use client"

import {
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from "react"
import type { CutoutBounds } from "./hit-test-strategy"
import {
  hoverEffects,
  type HoverEffect,
  type HoverEffectPreset,
  type GeometryStyle,
} from "./hover-effects"
import { CutoutContext, type CutoutContextValue } from "./cutout-context"
import { CutoutRegistryContext, useCutoutViewerContext } from "./viewer-context"
import type { RenderLayerProps } from "./cutout"

/* ------------------------------------------------------------------ */
/*  Helper: strip `filter` from a CSSProperties object                 */
/* ------------------------------------------------------------------ */

function stripFilter(style: CSSProperties): CSSProperties {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { filter: _, ...rest } = style
  return rest
}

/* ------------------------------------------------------------------ */
/*  BBoxCutout sub-component                                           */
/* ------------------------------------------------------------------ */

export interface BBoxCutoutProps {
  /** Unique identifier for this cutout */
  id: string
  /** Normalized 0-1 bounding box coordinates */
  bounds: { x: number; y: number; w: number; h: number }
  /** Human-readable label */
  label?: string
  /** Override the viewer-level hover effect for this specific cutout */
  effect?: HoverEffectPreset | HoverEffect
  /** Children rendered inside this cutout's context (e.g. `<Overlay>`) */
  children?: ReactNode
  /** Custom renderer for the cutout layer. When provided, replaces the default rendering. */
  renderLayer?: (props: RenderLayerProps) => ReactNode
}

export function BBoxCutout({
  id,
  bounds: defBounds,
  label,
  effect: effectOverride,
  children,
  renderLayer,
}: BBoxCutoutProps) {
  const registry = useContext(CutoutRegistryContext)
  const viewer = useCutoutViewerContext()

  if (!registry) {
    throw new Error(
      "<CutoutViewer.BBoxCutout> must be used inside <CutoutViewer>"
    )
  }

  /* --- Register / unregister -------------------------------------- */
  const { x: bx, y: by, w: bw, h: bh } = defBounds
  useEffect(() => {
    registry.registerCutout({ type: "bbox", id, bounds: { x: bx, y: by, w: bw, h: bh }, label })
    return () => registry.unregisterCutout(id)
  }, [id, bx, by, bw, bh, label, registry])

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

  // For geometry cutouts, use geometry-specific styles and strip the wrapper
  // filter (drop-shadow doesn't produce good visuals on geometric shapes).
  let geometryStyle: GeometryStyle | undefined
  let layerStyle: CSSProperties
  if (!viewer.enabled || (!viewer.isAnyActive && !viewer.showAll)) {
    // BBox indicators are hidden when idle — unlike image cutouts, they have
    // no transparent-PNG content that blends naturally with the background.
    layerStyle = { ...resolvedEffect.cutoutIdle, filter: "none", opacity: 0 }
    geometryStyle = resolvedEffect.geometryIdle
  } else if (viewer.showAll || isActive) {
    // Keep transform & opacity from cutoutActive but strip filter for geometry
    layerStyle = stripFilter(resolvedEffect.cutoutActive)
    geometryStyle = resolvedEffect.geometryActive
  } else {
    layerStyle = stripFilter(resolvedEffect.cutoutInactive)
    geometryStyle = resolvedEffect.geometryInactive
  }

  // Fallback geometry style if the effect doesn't define one
  const defaultGeometry: GeometryStyle = {
    fill: "rgba(37, 99, 235, 0.15)",
    stroke: "rgba(37, 99, 235, 0.6)",
    strokeWidth: 2,
  }
  const geo = geometryStyle ?? defaultGeometry

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
            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
                filter: geo.glow
                  ? `drop-shadow(${geo.glow.split(",")[0]?.trim() ?? ""})`
                  : "none",
              }}
            >
              <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.w}
                height={bounds.h}
                rx={0.004}
                fill={geo.fill}
                stroke={geo.stroke}
                strokeWidth={(geo.strokeWidth ?? 2) * 0.0015}
                strokeLinecap={geo.strokeDasharray ? "round" : undefined}
                strokeDasharray={geo.strokeDasharray}
                pathLength={geo.strokeDasharray ? 1 : undefined}
                style={{
                  transition: resolvedEffect.transition,
                  animation: geo.animation,
                }}
              />
            </svg>
          )}
      </div>

      {/* Children (overlay content) rendered on top */}
      {children}
    </CutoutContext.Provider>
  )
}
