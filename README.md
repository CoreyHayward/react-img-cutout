# react-img-cutout

`react-img-cutout` is a composable React component for interactive image cutouts.
It layers transparent PNGs over a base image, performs pixel-level alpha hit
testing, and exposes a compound API for overlays and custom hover effects.

## Quick Start

### 1) Install

```bash
npm install react-img-cutout
```

Peer dependencies:
- `react >= 18`
- `react-dom >= 18`

### 2) Render a viewer

```tsx
import { CutoutViewer } from "react-img-cutout"

export function ProductHero() {
  return (
    <CutoutViewer
      mainImage="/images/main.png"
      mainImageAlt="Product scene"
      effect="elevate"
      onSelect={(id) => console.log("selected:", id)}
    >
      <CutoutViewer.Cutout
        id="shoe"
        src="/images/cutouts/shoe.png"
        label="Shoe"
      >
        <CutoutViewer.Overlay placement="top-center">
          <button>View details</button>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>

      <CutoutViewer.Cutout
        id="bag"
        src="/images/cutouts/bag.png"
        label="Bag"
      />

      {/* No image needed — define regions with coordinates */}
      <CutoutViewer.BBoxCutout
        id="logo"
        bounds={{ x: 0.05, y: 0.05, w: 0.15, h: 0.1 }}
        label="Logo"
      />

      <CutoutViewer.PolygonCutout
        id="accent"
        points={[[0.7, 0.2], [0.9, 0.2], [0.85, 0.5], [0.65, 0.45]]}
        label="Accent"
      />
    </CutoutViewer>
  )
}
```

## Cutout Types

The library supports three different cutout types, each suited for different use cases.

### Image Cutout (`CutoutViewer.Cutout`)

The original cutout type — uses a transparent PNG aligned to the same coordinate
space as the main image. Hit-testing is performed per-pixel using the alpha channel.

```tsx
<CutoutViewer.Cutout
  id="shoe"
  src="/images/cutouts/shoe.png"
  label="Shoe"
>
  <CutoutViewer.Overlay placement="top-center">
    <button>View details</button>
  </CutoutViewer.Overlay>
</CutoutViewer.Cutout>
```

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Unique identifier for the cutout |
| `src` | `string` | URL of the cutout image (transparent PNG, same resolution as `mainImage`) |
| `label` | `string?` | Human-readable label (used as `alt` text) |
| `effect` | `HoverEffectPreset \| HoverEffect?` | Override the viewer-level hover effect for this cutout |
| `renderLayer` | `(props: RenderLayerProps) => ReactNode?` | Custom renderer replacing the default `<img>` |
| `children` | `ReactNode?` | Overlay content |

### Bounding Box Cutout (`CutoutViewer.BBoxCutout`)

Defines a rectangular region using normalized 0–1 coordinates. No image
required — the component renders a styled rectangle. Ideal for highlighting
areas of the image programmatically (e.g. from object-detection output).

```tsx
<CutoutViewer.BBoxCutout
  id="face"
  bounds={{ x: 0.3, y: 0.1, w: 0.2, h: 0.25 }}
  label="Face"
>
  <CutoutViewer.Overlay placement="top-center">
    <span>Detected face</span>
  </CutoutViewer.Overlay>
</CutoutViewer.BBoxCutout>
```

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Unique identifier for the cutout |
| `bounds` | `{ x, y, w, h }` | Normalized 0–1 bounding box (`x` and `y` are the top-left corner) |
| `label` | `string?` | Human-readable label |
| `effect` | `HoverEffectPreset \| HoverEffect?` | Override the viewer-level hover effect for this cutout |
| `renderLayer` | `(props: RenderLayerProps) => ReactNode?` | Custom renderer replacing the default rectangle |
| `children` | `ReactNode?` | Overlay content |

### Polygon Cutout (`CutoutViewer.PolygonCutout`)

Defines an arbitrary closed shape using an array of `[x, y]` normalized 0–1
points. Rendered as an SVG `<polygon>`. Great for non-rectangular regions such
as segmentation masks or hand-drawn annotations.

```tsx
<CutoutViewer.PolygonCutout
  id="lake"
  points={[
    [0.2, 0.6],
    [0.5, 0.55],
    [0.6, 0.7],
    [0.35, 0.8],
  ]}
  label="Lake"
>
  <CutoutViewer.Overlay placement="center">
    <span>Lake area</span>
  </CutoutViewer.Overlay>
</CutoutViewer.PolygonCutout>
```

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Unique identifier for the cutout |
| `points` | `[number, number][]` | Array of normalized 0–1 `[x, y]` points forming a closed path |
| `label` | `string?` | Human-readable label |
| `effect` | `HoverEffectPreset \| HoverEffect?` | Override the viewer-level hover effect for this cutout |
| `renderLayer` | `(props: RenderLayerProps) => ReactNode?` | Custom renderer replacing the default SVG polygon |
| `children` | `ReactNode?` | Overlay content |

## Public API

- `CutoutViewer`
  - Props: `mainImage`, `mainImageAlt`, `effect`, `enabled`, `showAll`,
    `alphaThreshold`, `hoverLeaveDelay`, `onHover`, `onActiveChange`, `onSelect`
- `CutoutViewer.Cutout` — image-based cutout (alpha hit-testing)
- `CutoutViewer.BBoxCutout` — bounding-box cutout (rectangular region)
- `CutoutViewer.PolygonCutout` — polygon cutout (arbitrary closed shape)
- `CutoutViewer.Overlay`
  - Props: `placement`, `className`, `style`
- `useCutout()`
  - Read nearest cutout state (`id`, `bounds`, `isActive`, `isHovered`, `isSelected`, `effect`)
- `hoverEffects`
  - Built-in presets: `elevate`, `glow`, `lift`, `subtle`, `trace`, `shimmer`
- `defineKeyframes(name, css)` — helper for declaring CSS `@keyframes` in custom effects

## How It Works

- **Image cutouts** are loaded into an offscreen canvas; opaque bounds and alpha
  data are computed once for pixel-level hit-testing.
- **BBox cutouts** use simple point-in-rect checks against normalized coordinates.
- **Polygon cutouts** use a ray-casting algorithm for point-in-polygon testing.
- Pointer positions are normalized to the container and hit-tested from front to back.
- Click locks selection; clicking empty space clears selection.
- Overlays are positioned from normalized cutout bounds using one of 9 placements.

## Important Implementation Notes

- Use transparent PNG/WebP cutouts aligned to the same coordinate space as `mainImage`.
- Best results come from matching cutout resolution to the base image resolution.
- BBox and Polygon cutouts do not require any image — they are defined purely by coordinates.
- Geometry cutouts (BBox/Polygon) are invisible when idle and appear on hover/selection,
  unlike image cutouts which blend naturally with the background.
- If a cutout image cannot be read from canvas (for example, CORS restrictions),
  hit testing for that cutout gracefully falls back and does not crash.
- The component does not require Tailwind to render correctly.

## Effects

Pass a preset name or a fully custom `HoverEffect` object to the `effect` prop.

### Built-in presets

| Preset | Description |
|--------|-------------|
| `elevate` | Lifts the hovered cutout with a blue glow and deep shadow |
| `glow` | Warm glow around the hovered cutout, no lift |
| `lift` | Strong lift with deep shadow, no color glow |
| `subtle` | Minimal — dims non-hovered cutouts with no animation |
| `trace` | A white dash continuously traces the cutout border |
| `shimmer` | style brightness flash that sweeps over the hovered subject |

### Custom static effects

```tsx
import { CutoutViewer, type HoverEffect } from "react-img-cutout"

const customEffect: HoverEffect = {
  name: "neon",
  transition: "all 0.4s ease",
  mainImageHovered: { filter: "brightness(0.2) grayscale(1)" },
  vignetteStyle: { background: "rgba(0,0,0,0.45)" },
  cutoutActive: { transform: "scale(1.03)", opacity: 1 },
  cutoutInactive: { transform: "scale(1)", opacity: 0.35 },
  cutoutIdle: { transform: "scale(1)", opacity: 1 },
}
```

### Custom animated effects

Use `defineKeyframes` to declare CSS `@keyframes` that the viewer injects
automatically. Reference the keyframe `name` in any `animation` property.

```tsx
import { defineKeyframes, type HoverEffect } from "react-img-cutout"

const pulse = defineKeyframes("my-pulse", `
  0%, 100% { transform: scale(1);    filter: brightness(1);    }
  50%      { transform: scale(1.06); filter: brightness(1.15); }
`)

const pulseEffect: HoverEffect = {
  name: "pulse",
  transition: "all 0.4s ease",
  keyframes: [pulse],
  mainImageHovered: { filter: "brightness(0.3)" },
  vignetteStyle: { background: "rgba(0,0,0,0.4)" },
  cutoutActive: {
    animation: `${pulse.name} 1.2s ease-in-out infinite`,
    opacity: 1,
  },
  cutoutInactive: { opacity: 0.3 },
  cutoutIdle: { opacity: 1 },
}
```

Geometry cutouts (BBox / Polygon) also support `strokeDasharray` and
`animation` on their `geometryActive` style for SVG-level animations
like the built-in trace effect.

## Local Development

- `npm run storybook` for interactive component testing
- `npm run lint` for lint checks
- `npm run build:lib` to generate `dist/` for npm
