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
  type GeometryStyle,
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

  /* --- Extract contour for geometry overlay ----------------------- */
  const hasGeometry = !!resolvedEffect.geometryActive
  const [contour, setContour] = useState<[number, number][] | null>(null)

  useEffect(() => {
    if (!hasGeometry) return
    let cancelled = false
    extractContour(src).then((pts) => {
      if (!cancelled && pts.length >= 3) setContour(pts)
    })
    return () => { cancelled = true }
  }, [src, hasGeometry])

  /* --- Compute state ---------------------------------------------- */
  const isActive = viewer.activeId === id
  const isHovered = viewer.hoveredId === id
  const isSelected = viewer.selectedId === id

  const defaultBounds: CutoutBounds = { x: 0, y: 0, w: 1, h: 1 }
  const bounds = viewer.boundsMap[id] ?? defaultBounds

  let layerStyle: CSSProperties
  let geometryStyle: GeometryStyle | undefined
  if (!viewer.enabled || (!viewer.isAnyActive && !viewer.showAll)) {
    layerStyle = resolvedEffect.cutoutIdle
    geometryStyle = resolvedEffect.geometryIdle
  } else if (viewer.showAll || isActive) {
    layerStyle = resolvedEffect.cutoutActive
    geometryStyle = resolvedEffect.geometryActive
  } else {
    layerStyle = resolvedEffect.cutoutInactive
    geometryStyle = resolvedEffect.geometryInactive
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

        {/* SVG polygon trace — uses the same geometry styles as bbox/polygon cutouts */}
        {contour && geometryStyle && (
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              filter: geometryStyle.glow
                ? `drop-shadow(${geometryStyle.glow.split(",")[0]?.trim() ?? ""})`
                : "none",
            }}
          >
            <polygon
              points={contour.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={geometryStyle.fill}
              stroke={geometryStyle.stroke}
              strokeWidth={(geometryStyle.strokeWidth ?? 2) * 0.0015}
              strokeLinejoin="round"
              strokeLinecap={geometryStyle.strokeDasharray ? "round" : undefined}
              strokeDasharray={geometryStyle.strokeDasharray}
              pathLength={geometryStyle.strokeDasharray ? 1 : undefined}
              style={{
                transition: resolvedEffect.transition,
                animation: geometryStyle.animation,
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
