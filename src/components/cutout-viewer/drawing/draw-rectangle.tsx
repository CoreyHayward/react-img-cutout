"use client"

import { useEffect, useContext, type CSSProperties } from "react"
import { CutoutRegistryContext } from "../viewer-context"
import {
  useDrawRectangle,
  type UseDrawRectangleOptions,
} from "./use-draw-rectangle"

export interface DrawRectangleProps extends UseDrawRectangleOptions {
  /**
   * Stroke / accent color used for the in-progress rectangle visualization.
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
 * Composable sub-component of `<CutoutViewer>` that lets users draw rectangle
 * regions directly on the main image via click-and-drag.
 *
 * ### Interactions
 * - **Pointer down** — anchor the first corner
 * - **Drag** — preview the rectangle in real time
 * - **Pointer up** — complete the rectangle and call `onComplete`
 * - **Escape** — cancel and reset the in-progress drawing
 *
 * All coordinates passed to `onComplete` are normalized (0–1), matching the
 * convention used by `<CutoutViewer.BBoxCutout>`.
 */
export function DrawRectangle({
  onComplete,
  minSize,
  strokeColor = "#3b82f6",
  enabled = true,
  style,
  className = "",
}: DrawRectangleProps) {
  const registry = useContext(CutoutRegistryContext)

  if (!registry) {
    throw new Error(
      "<CutoutViewer.DrawRectangle> must be used inside <CutoutViewer>"
    )
  }

  const { rect, reset, containerRef, containerProps } = useDrawRectangle({
    onComplete,
    minSize,
  })

  // Clear any in-progress drawing when drawing is disabled
  useEffect(() => {
    if (!enabled) reset()
  }, [enabled, reset])

  return (
    <div
      ref={containerRef}
      data-draw-rectangle="true"
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
      {rect && rect.w > 0 && rect.h > 0 && (
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
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={strokeColor}
            fillOpacity={0.15}
            stroke={strokeColor}
            strokeWidth={0.003}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.015 0.008"
          />
        </svg>
      )}
    </div>
  )
}
