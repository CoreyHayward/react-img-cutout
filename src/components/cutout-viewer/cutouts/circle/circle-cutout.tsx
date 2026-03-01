"use client"

import {
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from "react"
import type { CutoutBounds } from "../../hit-test-strategy"
import {
  hoverEffects,
  type HoverEffect,
  type HoverEffectPreset,
  type GeometryStyle,
} from "../../hover-effects"
import { CutoutContext, type CutoutContextValue } from "../cutout-context"
import { CutoutRegistryContext, useCutoutViewerContext } from "../../viewer-context"
import type { RenderLayerProps } from "../image/cutout"

function stripFilter(style: CSSProperties): CSSProperties {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { filter: _, ...rest } = style
  return rest
}

export interface CircleCutoutProps {
  /** Unique identifier for this cutout */
  id: string
  /** Normalized 0-1 center coordinate */
  center: { x: number; y: number }
  /** Normalized 0-1 radius as a fraction of min(viewerWidth, viewerHeight) */
  radius: number
  /** Human-readable label */
  label?: string
  /** Override the viewer-level hover effect for this specific cutout */
  effect?: HoverEffectPreset | HoverEffect
  /** Children rendered inside this cutout's context (e.g. `<Overlay>`) */
  children?: ReactNode
  /** Custom renderer for the cutout layer. When provided, replaces the default rendering. */
  renderLayer?: (props: RenderLayerProps) => ReactNode
}

export function CircleCutout({
  id,
  center: defCenter,
  radius: defRadius,
  label,
  effect: effectOverride,
  children,
  renderLayer,
}: CircleCutoutProps) {
  const registry = useContext(CutoutRegistryContext)
  const viewer = useCutoutViewerContext()

  if (!registry) {
    throw new Error(
      "<CutoutViewer.CircleCutout> must be used inside <CutoutViewer>"
    )
  }

  /* --- Register / unregister -------------------------------------- */
  const { x: cx, y: cy } = defCenter
  useEffect(() => {
    registry.registerCutout({ type: "circle", id, center: { x: cx, y: cy }, radius: defRadius, label })
    return () => registry.unregisterCutout(id)
  }, [id, cx, cy, defRadius, label, registry])

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
  const safeWidth = Math.max(1, viewer.viewportSize.width)
  const safeHeight = Math.max(1, viewer.viewportSize.height)
  const minDimension = Math.min(safeWidth, safeHeight)
  const rx = (defRadius * minDimension) / safeWidth
  const ry = (defRadius * minDimension) / safeHeight

  // For geometry cutouts, use geometry-specific styles and strip the wrapper
  // filter (drop-shadow doesn't produce good visuals on geometric shapes).
  let geometryStyle: GeometryStyle | undefined
  let layerStyle: CSSProperties
  if (!viewer.enabled || (!viewer.isAnyActive && !viewer.showAll)) {
    // Circle indicators are hidden when idle — unlike image cutouts, they have
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
              <ellipse
                cx={defCenter.x}
                cy={defCenter.y}
                rx={rx}
                ry={ry}
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
