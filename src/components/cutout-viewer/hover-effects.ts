import type { CSSProperties } from "react"

/**
 * Visual style for geometry-based cutouts (bbox, polygon).
 * These are applied directly to the inner shape element rather than the
 * wrapper div, because CSS `filter: drop-shadow()` on the wrapper doesn't
 * produce good results for geometric shapes the way it does for images.
 */
export interface GeometryStyle {
  /** Fill color (CSS color string) */
  fill: string
  /** Stroke / border color (CSS color string) */
  stroke: string
  /** Stroke width in px for bbox borders, or normalized units for polygon SVG */
  strokeWidth?: number
  /** Box-shadow string applied to bbox, or SVG filter glow for polygon */
  glow?: string
}

/**
 * A hover effect preset defines how the main image, the hovered cutout,
 * and the non-hovered cutouts should look during a hover interaction.
 *
 * The `cutout*` styles are applied to the wrapper div and work best with
 * image-based cutouts (transparent PNGs). For geometry-based cutouts
 * (bbox, polygon), the optional `geometry*` styles control the inner
 * shape's fill, stroke, and glow independently.
 */
export interface HoverEffect {
  /** Label for display / debugging */
  name: string
  /** Transition CSS applied to all animated elements */
  transition: string
  /** Styles applied to the main background image when any cutout is hovered */
  mainImageHovered: CSSProperties
  /** Styles for the vignette overlay when active */
  vignetteStyle: CSSProperties
  /** Styles applied to the actively-hovered cutout layer */
  cutoutActive: CSSProperties
  /** Styles applied to cutout layers that are NOT hovered while another is */
  cutoutInactive: CSSProperties
  /** Default cutout style when nothing is hovered */
  cutoutIdle: CSSProperties
  /** Styles for geometry-based cutout shapes when active (hovered/selected) */
  geometryActive?: GeometryStyle
  /** Styles for geometry-based cutout shapes when another cutout is active */
  geometryInactive?: GeometryStyle
  /** Styles for geometry-based cutout shapes in idle state (nothing hovered) */
  geometryIdle?: GeometryStyle
}

const SPRING = "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)"

/**
 * Apple Photos-style "Visual Look Up" effect.
 * Hovered item lifts, glows blue, background dims and desaturates.
 */
export const appleEffect: HoverEffect = {
  name: "apple",
  transition: SPRING,
  mainImageHovered: {
    filter: "brightness(0.45) saturate(0.7)",
  },
  vignetteStyle: {
    background:
      "radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.4) 100%)",
  },
  cutoutActive: {
    transform: "scale(1.04) translateY(-6px)",
    filter:
      "drop-shadow(0 0 28px rgba(130, 190, 255, 0.5)) drop-shadow(0 16px 48px rgba(0, 0, 0, 0.55))",
    opacity: 1,
  },
  cutoutInactive: {
    transform: "scale(1)",
    filter: "brightness(0.45) saturate(0.6)",
    opacity: 0.55,
  },
  cutoutIdle: {
    transform: "scale(1)",
    filter: "drop-shadow(0 1px 4px rgba(0, 0, 0, 0.12))",
    opacity: 1,
  },
  geometryActive: {
    fill: "rgba(130, 190, 255, 0.2)",
    stroke: "rgba(130, 190, 255, 0.9)",
    strokeWidth: 2,
    glow: "0 0 24px rgba(130, 190, 255, 0.5), 0 0 56px rgba(130, 190, 255, 0.2), 0 12px 40px rgba(0, 0, 0, 0.4)",
  },
  geometryInactive: {
    fill: "rgba(100, 150, 200, 0.06)",
    stroke: "rgba(100, 150, 200, 0.2)",
    strokeWidth: 1,
  },
  geometryIdle: {
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 1,
  },
}

/**
 * Subtle glow-only effect. No lift, just a warm glow around the hovered item.
 */
export const glowEffect: HoverEffect = {
  name: "glow",
  transition: SPRING,
  mainImageHovered: {
    filter: "brightness(0.55) saturate(0.8)",
  },
  vignetteStyle: {
    background:
      "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.3) 100%)",
  },
  cutoutActive: {
    transform: "scale(1)",
    filter:
      "drop-shadow(0 0 20px rgba(255, 200, 100, 0.6)) drop-shadow(0 0 60px rgba(255, 200, 100, 0.25))",
    opacity: 1,
  },
  cutoutInactive: {
    transform: "scale(1)",
    filter: "brightness(0.5) saturate(0.5)",
    opacity: 0.5,
  },
  cutoutIdle: {
    transform: "scale(1)",
    filter: "none",
    opacity: 1,
  },
  geometryActive: {
    fill: "rgba(255, 200, 100, 0.15)",
    stroke: "rgba(255, 200, 100, 0.85)",
    strokeWidth: 2,
    glow: "0 0 20px rgba(255, 200, 100, 0.5), 0 0 56px rgba(255, 200, 100, 0.2)",
  },
  geometryInactive: {
    fill: "rgba(200, 160, 80, 0.05)",
    stroke: "rgba(200, 160, 80, 0.2)",
    strokeWidth: 1,
  },
  geometryIdle: {
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 1,
  },
}

/**
 * Strong lift with deep shadow, no color glow.
 */
export const liftEffect: HoverEffect = {
  name: "lift",
  transition: SPRING,
  mainImageHovered: {
    filter: "brightness(0.4)",
  },
  vignetteStyle: {
    background: "rgba(0,0,0,0.25)",
  },
  cutoutActive: {
    transform: "scale(1.06) translateY(-10px)",
    filter: "drop-shadow(0 24px 64px rgba(0, 0, 0, 0.7))",
    opacity: 1,
  },
  cutoutInactive: {
    transform: "scale(0.97)",
    filter: "brightness(0.35)",
    opacity: 0.4,
  },
  cutoutIdle: {
    transform: "scale(1)",
    filter: "none",
    opacity: 1,
  },
  geometryActive: {
    fill: "rgba(255, 255, 255, 0.1)",
    stroke: "rgba(255, 255, 255, 0.7)",
    strokeWidth: 2,
    glow: "0 20px 56px rgba(0, 0, 0, 0.6), 0 0 16px rgba(255, 255, 255, 0.1)",
  },
  geometryInactive: {
    fill: "rgba(255, 255, 255, 0.02)",
    stroke: "rgba(255, 255, 255, 0.1)",
    strokeWidth: 1,
  },
  geometryIdle: {
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 1,
  },
}

/**
 * No animation - just shows which cutout the cursor is over via subtle dimming.
 */
export const subtleEffect: HoverEffect = {
  name: "subtle",
  transition: "all 0.3s ease",
  mainImageHovered: {
    filter: "brightness(0.7)",
  },
  vignetteStyle: {
    background: "transparent",
  },
  cutoutActive: {
    transform: "scale(1)",
    filter: "none",
    opacity: 1,
  },
  cutoutInactive: {
    transform: "scale(1)",
    filter: "none",
    opacity: 0.35,
  },
  cutoutIdle: {
    transform: "scale(1)",
    filter: "none",
    opacity: 1,
  },
  geometryActive: {
    fill: "rgba(255, 255, 255, 0.08)",
    stroke: "rgba(255, 255, 255, 0.5)",
    strokeWidth: 1,
  },
  geometryInactive: {
    fill: "transparent",
    stroke: "rgba(255, 255, 255, 0.1)",
    strokeWidth: 1,
  },
  geometryIdle: {
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 1,
  },
}

/**
 * Placeholder for a future trace/outline border effect.
 */
export const traceEffect: HoverEffect = {
  name: "trace",
  transition: SPRING,
  mainImageHovered: {
    filter: "brightness(0.35) saturate(0.5)",
  },
  vignetteStyle: {
    background:
      "radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 100%)",
  },
  cutoutActive: {
    transform: "scale(1)",
    filter: "drop-shadow(0 0 12px rgba(255, 255, 255, 0.25))",
    opacity: 1,
  },
  cutoutInactive: {
    transform: "scale(1)",
    filter: "brightness(0.35) saturate(0.4)",
    opacity: 0.4,
  },
  cutoutIdle: {
    transform: "scale(1)",
    filter: "none",
    opacity: 1,
  },
}

/** Built-in preset map for convenience */
export const hoverEffects = {
  apple: appleEffect,
  glow: glowEffect,
  lift: liftEffect,
  subtle: subtleEffect,
  trace: traceEffect,
} as const

export type HoverEffectPreset = keyof typeof hoverEffects
