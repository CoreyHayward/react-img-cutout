export { CutoutViewer, CutoutOverlay } from "./cutout-viewer"
export type {
  CutoutViewerProps,
  CutoutOverlayProps,
  CutoutProps,
  BBoxCutoutProps,
  PolygonCutoutProps,
  RenderLayerProps,
  Placement,
} from "./cutout-viewer"

export { useCutout } from "./cutout-context"

export { useCutoutHitTest } from "./use-cutout-hit-test"
export type { CutoutImage, CutoutBounds } from "./use-cutout-hit-test"

export type {
  CutoutDefinition,
  ImageCutoutDefinition,
  BoundingBoxCutoutDefinition,
  PolygonCutoutDefinition,
  HitTestStrategy,
} from "./use-cutout-hit-test"

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

