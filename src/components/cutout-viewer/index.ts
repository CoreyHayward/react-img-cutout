export { CutoutViewer } from "./cutout-viewer"
export type { CutoutViewerProps } from "./cutout-viewer"

export { CutoutOverlay } from "./cutouts/cutout-overlay"
export type { CutoutOverlayProps, Placement } from "./cutouts/cutout-overlay"

export type { CutoutProps, RenderLayerProps } from "./cutouts/image/cutout"
export type { BBoxCutoutProps } from "./cutouts/bbox/bbox-cutout"
export type { PolygonCutoutProps } from "./cutouts/polygon/polygon-cutout"
export type { CircleCutoutProps } from "./cutouts/circle/circle-cutout"

export { DrawPolygon } from "./drawing/draw-polygon"
export type { DrawPolygonProps } from "./drawing/draw-polygon"

export { DrawRectangle } from "./drawing/draw-rectangle"
export type { DrawRectangleProps } from "./drawing/draw-rectangle"

export { DrawCircle } from "./drawing/draw-circle"
export type { DrawCircleProps } from "./drawing/draw-circle"

export { useDrawPolygon } from "./drawing/use-draw-polygon"
export type {
  UseDrawPolygonOptions,
  UseDrawPolygonReturn,
} from "./drawing/use-draw-polygon"

export { useDrawRectangle } from "./drawing/use-draw-rectangle"
export type {
  UseDrawRectangleOptions,
  UseDrawRectangleReturn,
} from "./drawing/use-draw-rectangle"

export { useDrawCircle } from "./drawing/use-draw-circle"
export type {
  UseDrawCircleOptions,
  UseDrawCircleReturn,
} from "./drawing/use-draw-circle"

export { useCutout } from "./cutouts/cutout-context"

export { useCutoutHitTest } from "./use-cutout-hit-test"
export type { CutoutImage, CutoutBounds } from "./use-cutout-hit-test"

export type {
  CutoutDefinition,
  ImageCutoutDefinition,
  BoundingBoxCutoutDefinition,
  PolygonCutoutDefinition,
  CircleCutoutDefinition,
  HitTestStrategy,
} from "./hit-test-strategy"

export {
  ImageHitTestStrategy,
  RectHitTestStrategy,
  PolygonHitTestStrategy,
  CircleHitTestStrategy,
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

