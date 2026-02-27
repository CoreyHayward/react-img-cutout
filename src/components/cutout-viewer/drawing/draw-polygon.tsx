"use client"

import { useEffect, useContext, type CSSProperties } from "react"
import { CutoutRegistryContext } from "../viewer-context"
import {
  useDrawPolygon,
  type UseDrawPolygonOptions,
} from "./use-draw-polygon"

export interface DrawPolygonProps extends UseDrawPolygonOptions {
  /**
   * Stroke / accent color used for the in-progress polygon visualization.
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
 * Composable sub-component of `<CutoutViewer>` that lets users draw freeform
 * polygon regions directly on the main image.
 *
 * ### Interactions
 * - **Click** — add a vertex
 * - **Click near the first vertex** (≥ `minPoints` vertices drawn) — snap-close
 *   and call `onComplete`
 * - **Double-click** — complete the polygon immediately
 * - **Right-click** — remove the last vertex
 * - **Escape** — cancel and reset the in-progress drawing
 *
 * All coordinates passed to `onComplete` are normalized (0–1), matching the
 * convention used by `<CutoutViewer.PolygonCutout>`.
 *
 * @example
 * ```tsx
 * const [drawnRegions, setDrawnRegions] = useState<[number,number][][]>([])
 *
 * <CutoutViewer mainImage="/photo.png">
 *   <CutoutViewer.DrawPolygon
 *     onComplete={(points) =>
 *       setDrawnRegions((prev) => [...prev, points])
 *     }
 *   />
 *   {drawnRegions.map((points, i) => (
 *     <CutoutViewer.PolygonCutout
 *       key={i}
 *       id={`region-${i}`}
 *       points={points}
 *       label={`Region ${i + 1}`}
 *     />
 *   ))}
 * </CutoutViewer>
 * ```
 */
export function DrawPolygon({
  onComplete,
  minPoints = 3,
  closeThreshold = 0.03,
  strokeColor = "#3b82f6",
  enabled = true,
  style,
  className = "",
}: DrawPolygonProps) {
  const registry = useContext(CutoutRegistryContext)

  if (!registry) {
    throw new Error(
      "<CutoutViewer.DrawPolygon> must be used inside <CutoutViewer>"
    )
  }

  const {
    points,
    previewPoint,
    willClose,
    reset,
    containerRef,
    containerProps,
  } = useDrawPolygon({ onComplete, minPoints, closeThreshold })

  // ESC key cancels the current drawing
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") reset()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [reset])

  // Clear any in-progress drawing when drawing is disabled
  useEffect(() => {
    if (!enabled) reset()
  }, [enabled, reset])

  // Build the list of all render-points: drawn points + live cursor preview
  const allPoints: [number, number][] = previewPoint
    ? [...points, previewPoint]
    : points

  // SVG polyline points string
  const polylinePoints = allPoints
    .map(([x, y]) => `${x},${y}`)
    .join(" ")

  return (
    <div
      ref={containerRef}
      data-draw-polygon="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        cursor: !enabled ? "default" : willClose ? "cell" : "crosshair",
        zIndex: 30,
        pointerEvents: enabled ? "auto" : "none",
        ...style,
      }}
      {...(enabled ? containerProps : {})}
    >
      {points.length > 0 && (
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
          {/* Semi-transparent fill for the in-progress polygon */}
          {points.length >= 3 && (
            <polygon
              points={points.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={strokeColor}
              fillOpacity={0.15}
              stroke="none"
            />
          )}

          {/* Outline connecting all drawn points + cursor preview */}
          {allPoints.length >= 2 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={strokeColor}
              strokeWidth={0.003}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={previewPoint ? "0.015 0.008" : undefined}
            />
          )}

          {/* Closing guide line from cursor back to first point */}
          {previewPoint && points.length >= 1 && (
            <line
              x1={previewPoint[0]}
              y1={previewPoint[1]}
              x2={points[0][0]}
              y2={points[0][1]}
              stroke={strokeColor}
              strokeWidth={0.002}
              strokeDasharray="0.015 0.008"
              strokeLinecap="round"
              opacity={willClose ? 0.9 : 0.35}
            />
          )}

          {/* Vertex dots */}
          {points.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === 0 ? 0.012 : 0.007}
              fill={i === 0 && willClose ? strokeColor : "white"}
              stroke={strokeColor}
              strokeWidth={0.002}
            />
          ))}

          {/* Cursor preview dot */}
          {previewPoint && (
            <circle
              cx={previewPoint[0]}
              cy={previewPoint[1]}
              r={0.005}
              fill={willClose ? strokeColor : "white"}
              stroke={strokeColor}
              strokeWidth={0.002}
              opacity={0.8}
            />
          )}
        </svg>
      )}
    </div>
  )
}
