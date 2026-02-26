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
} from "../../hover-effects"
import { CutoutContext, type CutoutContextValue } from "../cutout-context"
import { CutoutRegistryContext, useCutoutViewerContext } from "../../viewer-context"

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
      </div>

      {/* Children (overlay content) rendered on top */}
      {children}
    </CutoutContext.Provider>
  )
}
