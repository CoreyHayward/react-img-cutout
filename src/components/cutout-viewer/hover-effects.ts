import type { CSSProperties } from "react"

/* ------------------------------------------------------------------ */
/*  Keyframe animation primitives                                      */
/* ------------------------------------------------------------------ */

/**
 * Describes a CSS `@keyframes` rule that an effect needs at runtime.
 *
 * Use the {@link defineKeyframes} helper to create instances.
 *
 * @example
 * ```ts
 * const pulse = defineKeyframes("my-pulse", `
 *   0%, 100% { opacity: 1; }
 *   50%      { opacity: 0.5; }
 * `)
 * ```
 */
export interface KeyframeAnimation {
  /** Unique name for the `@keyframes` rule (used in CSS `animation-name`). */
  name: string
  /** The raw CSS content placed inside `@keyframes <name> { … }`. */
  css: string
}

/**
 * Helper to define a {@link KeyframeAnimation} for use in custom hover effects.
 *
 * @param name  A unique animation name. Prefix with your library/app name to
 *              avoid collisions (e.g. `"myapp-pulse"`).
 * @param css   The CSS keyframe stops — the content that goes inside the
 *              `@keyframes` braces.
 *
 * @example
 * ```ts
 * const pulse = defineKeyframes("myapp-pulse", `
 *   0%, 100% { transform: scale(1); }
 *   50%      { transform: scale(1.08); }
 * `)
 *
 * const myEffect: HoverEffect = {
 *   name: "pulse",
 *   keyframes: [pulse],
 *   cutoutActive: {
 *     animation: `${pulse.name} 1.2s ease-in-out infinite`,
 *     // ...
 *   },
 *   // ...
 * }
 * ```
 */
export function defineKeyframes(name: string, css: string): KeyframeAnimation {
  return { name, css }
}

/* ------------------------------------------------------------------ */
/*  Keyframe injection                                                 */
/* ------------------------------------------------------------------ */

/**
 * Set of keyframe names already injected into the document `<head>`.
 * Using a Set (rather than a per-name boolean) keeps bookkeeping tidy
 * when many effects share or re-use the same keyframe definitions.
 * @internal
 */
const _injectedKeyframes = new Set<string>()

/**
 * Lazily inject the `@keyframes` rules declared by a {@link HoverEffect}
 * into the document `<head>`. Each keyframe name is injected at most once
 * regardless of how many times this function is called.
 *
 * Called automatically by `<CutoutViewer>` whenever the active effect
 * changes, so consumers never need to call this manually.
 * @internal
 */
export function ensureEffectKeyframes(effect: HoverEffect): void {
  if (!effect.keyframes?.length || typeof document === "undefined") return

  for (const kf of effect.keyframes) {
    if (_injectedKeyframes.has(kf.name)) continue
    _injectedKeyframes.add(kf.name)

    const style = document.createElement("style")
    style.setAttribute("data-ricut-kf", kf.name)
    style.textContent = `@keyframes ${kf.name} {\n${kf.css}\n}`
    document.head.appendChild(style)
  }
}

/* ------------------------------------------------------------------ */
/*  Style interfaces                                                   */
/* ------------------------------------------------------------------ */

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
  /**
   * SVG `stroke-dasharray` value. Creates a dashed stroke pattern.
   * Values are relative to `pathLength` (normalised to 1), so
   * `"0.15 0.85"` = 15 % visible dash, 85 % gap.
   */
  strokeDasharray?: string
  /**
   * CSS `animation` shorthand applied to the inner SVG shape element.
   * Pair with a {@link KeyframeAnimation} declared in the parent
   * effect's `keyframes` array for automatic injection.
   */
  animation?: string
}

/**
 * A hover effect preset defines how the main image, the hovered cutout,
 * and the non-hovered cutouts should look during a hover interaction.
 *
 * The `cutout*` styles are applied to the wrapper div and work best with
 * image-based cutouts (transparent PNGs). For geometry-based cutouts
 * (bbox, polygon), the optional `geometry*` styles control the inner
 * shape's fill, stroke, and glow independently.
 *
 * For effects that use CSS animations, declare the required `@keyframes`
 * in the {@link keyframes} array and reference their names in the
 * `animation` property of the relevant `cutout*` style. The viewer
 * automatically injects them into `<head>` at runtime.
 *
 * @example
 * ```ts
 * import { defineKeyframes, type HoverEffect } from "react-img-cutout"
 *
 * const pulse = defineKeyframes("my-pulse", `
 *   0%, 100% { transform: scale(1); filter: brightness(1); }
 *   50%      { transform: scale(1.05); filter: brightness(1.15); }
 * `)
 *
 * export const pulseEffect: HoverEffect = {
 *   name: "pulse",
 *   keyframes: [pulse],
 *   transition: "all 0.4s ease",
 *   cutoutActive: {
 *     animation: \`\${pulse.name} 1.2s ease-in-out infinite\`,
 *     opacity: 1,
 *   },
 *   // … remaining style fields
 * }
 * ```
 */
export interface HoverEffect {
  /** Label for display / debugging */
  name: string
  /** Transition CSS applied to all animated elements */
  transition: string
  /**
   * CSS `@keyframes` rules this effect requires at runtime.
   * The viewer injects them into `<head>` automatically — consumers
   * only need to declare them here and reference the animation `name`
   * in the relevant `cutout*` / `geometry*` style properties.
   */
  keyframes?: KeyframeAnimation[]
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
 * Elevate effect — the hovered item lifts, glows blue, background dims and desaturates.
 * Inspired by Visual Look Up interactions.
 */
export const elevateEffect: HoverEffect = {
  name: "elevate",
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

/* ------------------------------------------------------------------ */
/*  Trace effect keyframes                                             */
/* ------------------------------------------------------------------ */

/** Animates `stroke-dashoffset` to move a partial stroke around the shape. */
const traceStrokeKeyframes = defineKeyframes(
  "_ricut-trace-stroke",
  `from { stroke-dashoffset: 0; }
   to   { stroke-dashoffset: -1; }`
)

/** Sweeps a white drop-shadow highlight around image-based cutout edges. */
const traceGlowKeyframes = defineKeyframes(
  "_ricut-trace-glow",
  `0%   { filter: drop-shadow(-3px -3px 6px rgba(255,255,255,0.6)) drop-shadow(0 0 2px rgba(255,255,255,0.15)); }
   25%  { filter: drop-shadow(3px -3px 6px rgba(255,255,255,0.6)) drop-shadow(0 0 2px rgba(255,255,255,0.15)); }
   50%  { filter: drop-shadow(3px 3px 6px rgba(255,255,255,0.6)) drop-shadow(0 0 2px rgba(255,255,255,0.15)); }
   75%  { filter: drop-shadow(-3px 3px 6px rgba(255,255,255,0.6)) drop-shadow(0 0 2px rgba(255,255,255,0.15)); }
   100% { filter: drop-shadow(-3px -3px 6px rgba(255,255,255,0.6)) drop-shadow(0 0 2px rgba(255,255,255,0.15)); }`
)

/**
 * Trace effect — a short white dash endlessly travels around the cutout
 * border, tracing its outline. For image-based cutouts a white drop-shadow
 * highlight sweeps around the silhouette edge.
 */
export const traceEffect: HoverEffect = {
  name: "trace",
  transition: SPRING,
  keyframes: [traceStrokeKeyframes, traceGlowKeyframes],
  mainImageHovered: {
    filter: "brightness(0.35) saturate(0.5)",
  },
  vignetteStyle: {
    background:
      "radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 100%)",
  },
  cutoutActive: {
    transform: "scale(1)",
    filter: "drop-shadow(-3px -3px 6px rgba(255,255,255,0.6)) drop-shadow(0 0 2px rgba(255,255,255,0.15))",
    opacity: 1,
    animation: `${traceGlowKeyframes.name} 3s linear infinite`,
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
  geometryActive: {
    fill: "rgba(255, 255, 255, 0.03)",
    stroke: "rgba(255, 255, 255, 0.9)",
    strokeWidth: 2.5,
    strokeDasharray: "0.15 0.85",
    animation: `${traceStrokeKeyframes.name} 3s linear infinite`,
    glow: "0 0 10px rgba(255, 255, 255, 0.25)",
  },
  geometryInactive: {
    fill: "transparent",
    stroke: "rgba(255, 255, 255, 0.15)",
    strokeWidth: 1,
  },
  geometryIdle: {
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 1,
  },
}

/* ------------------------------------------------------------------ */
/*  Shimmer effect — Apple-style shine over hovered cutouts            */
/* ------------------------------------------------------------------ */

const shimmerKeyframes = defineKeyframes(
  "_ricut-shimmer",
  `0%, 100% {
    filter: brightness(1.05) contrast(1.02)
            drop-shadow(0 0 6px rgba(255, 255, 255, 0.12))
            drop-shadow(0 12px 32px rgba(0, 0, 0, 0.4));
  }
  18% {
    filter: brightness(1.4) contrast(1.08)
            drop-shadow(0 0 14px rgba(255, 255, 255, 0.4))
            drop-shadow(0 12px 32px rgba(0, 0, 0, 0.4));
  }
  36% {
    filter: brightness(1.05) contrast(1.02)
            drop-shadow(0 0 6px rgba(255, 255, 255, 0.12))
            drop-shadow(0 12px 32px rgba(0, 0, 0, 0.4));
  }`
)

/**
 * Shimmer effect — the hovered cutout lifts and periodically flashes
 * brighter, as though light is sweeping across its surface. Inspired by
 * the Apple "lift subject to create sticker" interaction.
 *
 * The brightness pulse occupies roughly the first third of each cycle,
 * leaving the remaining time at the resting state so the glint feels
 * natural rather than strobing.
 */
export const shimmerEffect: HoverEffect = {
  name: "shimmer",
  transition: SPRING,
  keyframes: [shimmerKeyframes],
  mainImageHovered: {
    filter: "brightness(0.35) saturate(0.6)",
  },
  vignetteStyle: {
    background:
      "radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.5) 100%)",
  },
  cutoutActive: {
    transform: "scale(1.04) translateY(-6px)",
    /* The resting filter is overridden by the animation keyframes, but
       we set it here so there's a graceful look before the first frame. */
    filter:
      "brightness(1.05) contrast(1.02) drop-shadow(0 0 6px rgba(255,255,255,0.12)) drop-shadow(0 12px 32px rgba(0,0,0,0.4))",
    opacity: 1,
    animation: `${shimmerKeyframes.name} 2.4s ease-in-out infinite`,
  },
  cutoutInactive: {
    transform: "scale(1)",
    filter: "brightness(0.35) saturate(0.5)",
    opacity: 0.4,
  },
  cutoutIdle: {
    transform: "scale(1)",
    filter: "drop-shadow(0 1px 4px rgba(0, 0, 0, 0.1))",
    opacity: 1,
  },
  geometryActive: {
    fill: "rgba(255, 255, 255, 0.1)",
    stroke: "rgba(255, 255, 255, 0.7)",
    strokeWidth: 2,
    glow: "0 0 14px rgba(255, 255, 255, 0.35), 0 12px 32px rgba(0, 0, 0, 0.4)",
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

/** Built-in preset map for convenience */
export const hoverEffects = {
  elevate: elevateEffect,
  glow: glowEffect,
  lift: liftEffect,
  subtle: subtleEffect,
  trace: traceEffect,
  shimmer: shimmerEffect,
} as const

export type HoverEffectPreset = keyof typeof hoverEffects
