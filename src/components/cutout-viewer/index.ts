export { CutoutViewer } from "./cutout-viewer"
export type { CutoutViewerProps } from "./cutout-viewer"

export { CutoutOverlay } from "./cutouts/cutout-overlay"
export type { CutoutOverlayProps, Placement } from "./cutouts/cutout-overlay"

export type { CutoutProps, RenderLayerProps } from "./cutouts/image/cutout"
export type { BBoxCutoutProps } from "./cutouts/bbox/bbox-cutout"
export type { PolygonCutoutProps } from "./cutouts/polygon/polygon-cutout"

export { useCutout } from "./cutouts/cutout-context"

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

