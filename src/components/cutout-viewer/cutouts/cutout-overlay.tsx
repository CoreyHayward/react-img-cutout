"use client"

import {
  useContext,
  type ReactNode,
  type CSSProperties,
} from "react"
import type { CutoutBounds } from "../hit-test-strategy"
import { CutoutContext } from "./cutout-context"
import { useCutoutViewerContext } from "../viewer-context"

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
