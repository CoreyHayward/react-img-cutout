"use client"

import { useEffect, useContext, type CSSProperties } from "react"
import { CutoutRegistryContext } from "../viewer-context"
import {
  useDrawCircle,
  type UseDrawCircleOptions,
} from "./use-draw-circle"

export interface DrawCircleProps extends UseDrawCircleOptions {
  /**
   * Stroke / accent color used for the in-progress circle visualization.
   * Accepts any CSS color string.
   * @default "#3b82f6"
   */
  strokeColor?: string
  /**
   * When `false`, the drawing overlay becomes fully transparent to pointer
   * events and any in-progress drawing is cleared. Useful for toggling draw
   * mode on/off without unmounting the component.
   * @default true
   */
  enabled?: boolean
  /** Additional inline styles applied to the drawing overlay container */
  style?: CSSProperties
  /** Additional class name applied to the drawing overlay container */
  className?: string
}

/**
 * Composable sub-component of `<CutoutViewer>` that lets users draw circle
 * regions directly on the main image via click-and-drag.
 *
 * ### Interactions
 * - **Pointer down** — set the center point
 * - **Drag** — preview the circle in real time (radius = distance from center)
 * - **Pointer up** — complete the circle and call `onComplete`
 * - **Escape** — cancel and reset the in-progress drawing
 *
 * All coordinates passed to `onComplete` are normalized (0–1), matching the
 * convention used by `<CutoutViewer.CircleCutout>`.
 */
export function DrawCircle({
  onComplete,
  minRadius,
  strokeColor = "#3b82f6",
  enabled = true,
  style,
  className = "",
}: DrawCircleProps) {
  const registry = useContext(CutoutRegistryContext)

  if (!registry) {
    throw new Error(
      "<CutoutViewer.DrawCircle> must be used inside <CutoutViewer>"
    )
  }

  const { circle, reset, containerRef, containerProps } = useDrawCircle({
    onComplete,
    minRadius,
  })

  // Clear any in-progress drawing when drawing is disabled
  useEffect(() => {
    if (!enabled) reset()
  }, [enabled, reset])

  return (
    <div
      ref={containerRef}
      data-draw-circle="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        cursor: !enabled ? "default" : "crosshair",
        zIndex: 30,
        pointerEvents: enabled ? "auto" : "none",
        ...style,
      }}
      {...(enabled ? containerProps : {})}
    >
      {circle && circle.radius > 0 && (
        <svg
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <ellipse
            cx={circle.center.x}
            cy={circle.center.y}
            rx={circle.radius}
            ry={circle.radius}
            fill={strokeColor}
            fillOpacity={0.15}
            stroke={strokeColor}
            strokeWidth={0.003}
            strokeLinecap="round"
            strokeDasharray="0.015 0.008"
          />
        </svg>
      )}
    </div>
  )
}
