export { CutoutViewer } from "./cutout-viewer"
export type { CutoutViewerProps } from "./cutout-viewer"

export { CutoutOverlay } from "./cutout-overlay"
export type { CutoutOverlayProps, Placement } from "./cutout-overlay"

export type { CutoutProps, RenderLayerProps } from "./cutout"
export type { BBoxCutoutProps } from "./bbox-cutout"
export type { PolygonCutoutProps } from "./polygon-cutout"

export { useCutout } from "./cutout-context"

export { useCutoutHitTest } from "./use-cutout-hit-test"
export type { CutoutImage, CutoutBounds } from "./use-cutout-hit-test"

export type {
  CutoutDefinition,
  ImageCutoutDefinition,
  BoundingBoxCutoutDefinition,
  PolygonCutoutDefinition,
  HitTestStrategy,
} from "./hit-test-strategy"

export {
  ImageHitTestStrategy,
  RectHitTestStrategy,
  PolygonHitTestStrategy,
  createHitTestStrategy,
} from "./hit-test-strategy"

export {
  hoverEffects,
  elevateEffect,
  glowEffect,
  liftEffect,
  subtleEffect,
  traceEffect,
  shimmerEffect,
  defineKeyframes,
} from "./hover-effects"
export type {
  HoverEffect,
  HoverEffectPreset,
  GeometryStyle,
  KeyframeAnimation,
} from "./hover-effects"

