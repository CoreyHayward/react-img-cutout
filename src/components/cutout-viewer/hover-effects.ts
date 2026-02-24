import type { CSSProperties } from "react"

/**
 * A hover effect preset defines how the main image, the hovered cutout,
 * and the non-hovered cutouts should look during a hover interaction.
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
