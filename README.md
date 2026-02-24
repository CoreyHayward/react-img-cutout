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
      effect="apple"
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
    </CutoutViewer>
  )
}
```

## Public API

- `CutoutViewer`
  - Props: `mainImage`, `mainImageAlt`, `effect`, `enabled`, `showAll`,
    `alphaThreshold`, `hoverLeaveDelay`, `onHover`, `onActiveChange`, `onSelect`
- `CutoutViewer.Cutout`
  - Props: `id`, `src`, `label`, `effect`
- `CutoutViewer.Overlay`
  - Props: `placement`, `className`, `style`
- `useCutout()`
  - Read nearest cutout state (`id`, `bounds`, `isActive`, `isHovered`, `isSelected`, `effect`)
- `hoverEffects`
  - Built-in presets: `apple`, `glow`, `lift`, `subtle`, `trace`

## How It Works

- Each cutout image is loaded into an offscreen canvas.
- Opaque bounds are computed once using the alpha channel.
- Pointer positions are normalized to the container and hit-tested from front to back.
- Click locks selection; clicking empty space clears selection.
- Overlays are positioned from normalized cutout bounds using one of 9 placements.

## Important Implementation Notes

- Use transparent PNG/WebP cutouts aligned to the same coordinate space as `mainImage`.
- Best results come from matching cutout resolution to the base image resolution.
- If a cutout image cannot be read from canvas (for example, CORS restrictions),
  hit testing for that cutout gracefully falls back and does not crash.
- The component does not require Tailwind to render correctly.

## Effects

You can pass a preset name or a fully custom `HoverEffect` object.

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

## Local Development

- `npm run storybook` for interactive component testing
- `npm run lint` for lint checks
- `npm run build:lib` to generate `dist/` for npm
