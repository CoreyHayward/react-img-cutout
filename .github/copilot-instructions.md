# Copilot Instructions for react-img-cutout

## Project Overview

`react-img-cutout` is a React component library that provides pixel-perfect interactive image regions. It composites a main background image with transparent-PNG cutout layers and applies hover/selection effects, supporting image-based, bounding-box, polygon, and circle region types.

## Tech Stack

- **Language**: TypeScript (~5.9)
- **Framework**: React 18+ (peer dependency)
- **Build tool**: Vite 7 with dual config — `vite.config.ts` (library) and `vite.config.demo.ts` (demo app)
- **Testing**: Storybook stories + `@storybook/addon-vitest` + Playwright (Chromium, headless)
- **Linting**: ESLint 9 (flat config in `eslint.config.js`) with TypeScript-ESLint, React Hooks, React Refresh, and Storybook plugins
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`) — used only in the demo; the library itself has no Tailwind dependency at runtime
- **Release**: `semantic-release` triggered on pushes to `main`

## Repository Structure

```
src/
  index.ts                          # Library entry point (re-exports everything)
  components/
    cutout-viewer/
      cutout-viewer.tsx             # Main compound component (CutoutViewer)
      cutout-viewer.stories.tsx     # Storybook stories (also serve as tests)
      hit-test-strategy.ts          # CutoutDefinition union + HitTestStrategy interface + factory
      hover-effects.ts              # HoverEffect types + 6 built-in presets + defineKeyframes
      use-cutout-hit-test.ts        # Core pointer-event/hit-test hook
      viewer-context.ts             # React contexts (registry + viewer state)
      index.ts                      # Component-level re-exports
      cutouts/
        image/                      # <CutoutViewer.Cutout> (alpha-channel hit testing)
        bbox/                       # <CutoutViewer.BBoxCutout> (point-in-rect)
        polygon/                    # <CutoutViewer.PolygonCutout> (ray-cast)
        circle/                     # <CutoutViewer.CircleCutout> (point-in-circle)
        cutout-context.ts           # Per-cutout React context
        cutout-overlay.tsx          # <CutoutViewer.Overlay> (9 placement positions)
      drawing/
        draw-polygon.tsx / use-draw-polygon.ts
        draw-rectangle.tsx / use-draw-rectangle.ts
        draw-circle.tsx / use-draw-circle.ts
demo/                               # Standalone Vite demo app (not part of npm package)
public/                             # Demo images served to both lib dev and demo app
.storybook/                         # Storybook config (main.ts, preview.ts, vitest.setup.ts)
dist/                               # Build output (gitignored) — index.js, index.cjs, index.d.ts
```

## Key Commands

```bash
npm run lint          # ESLint — run before every PR
npm run build:lib     # Compile library to dist/ (Vite ESM/CJS + tsc for .d.ts)
npm run build:demo    # Build the demo app to demo-dist/
npm run storybook     # Start Storybook dev server on port 6006
npm run build-storybook  # Build static Storybook
npm run dev           # Vite dev server (library)
npm run dev:demo      # Vite dev server (demo app)
```

There is **no standalone `npm test` script**. Tests are stories run through Storybook's Vitest addon:

```bash
# From Storybook UI: Sidebar → Run tests
# Or via Vitest directly (requires Playwright/Chromium to be installed):
npx vitest --project storybook
```

> **Note**: Playwright/Chromium must be installed before running browser tests:
> ```bash
> npx playwright install chromium
> ```

## CI / CD

The only workflow is `.github/workflows/release.yml`. On every push to `main` it:
1. Installs dependencies (`npm ci`)
2. Lints (`npm run lint`)
3. Builds the library (`npm run build:lib`)
4. Runs `semantic-release` (auto-versions and publishes to npm if commits follow Conventional Commits)

There is **no automated test step in CI**. Tests must be run locally via Storybook.

## Architecture & Patterns

### Compound Component Pattern

`CutoutViewer` is the root component; all sub-components are attached to it:

```tsx
<CutoutViewer mainImage="/scene.png" effect="elevate" onSelect={(id) => …}>
  <CutoutViewer.Cutout id="shoe" src="/shoe.png" label="Shoe" />
  <CutoutViewer.BBoxCutout id="logo" bounds={{ x: 0.05, y: 0.05, w: 0.15, h: 0.1 }} />
  <CutoutViewer.PolygonCutout id="lake" points={[[0.2,0.6],[0.5,0.55],[0.6,0.7]]} />
  <CutoutViewer.CircleCutout id="dot" center={{ x: 0.5, y: 0.5 }} radius={0.1} />
  <CutoutViewer.DrawPolygon onComplete={(pts) => …} />
  <CutoutViewer.Overlay placement="top-center">…</CutoutViewer.Overlay>
</CutoutViewer>
```

### CutoutDefinition Discriminated Union

Cutout types are represented as a discriminated union in `hit-test-strategy.ts`:

```ts
type CutoutDefinition =
  | ImageCutoutDefinition    // { type: "image", src: string }
  | BoundingBoxCutoutDefinition // { type: "bbox", bounds: {x,y,w,h} }
  | PolygonCutoutDefinition  // { type: "polygon", points: [number,number][] }
  | CircleCutoutDefinition   // { type: "circle", center: {x,y}, radius: number }
```

All coordinates are **normalized to 0–1** (fraction of the viewer's width/height).

### HitTestStrategy Interface

Each cutout type maps to a strategy class:
- `ImageHitTestStrategy` — loads a canvas, extracts alpha into a `Uint8Array`, O(1) lookup per hit test
- `RectHitTestStrategy` — simple AABB point-in-rect
- `PolygonHitTestStrategy` — ray-casting algorithm
- `CircleHitTestStrategy` — distance-from-center check

Strategies implement `{ hitTest(nx, ny): boolean, bounds: CutoutBounds, contour?, prepare?(), dispose?() }`.

### Cutout Registration

Each cutout sub-component registers itself with the viewer via `CutoutRegistryContext` on mount and unregisters on unmount. The viewer derives `CutoutDefinition[]` from this registry to pass to `useCutoutHitTest`.

### Hover Effects

Effects are `HoverEffect` objects containing CSS-in-JS style maps for `cutoutActive`, `cutoutInactive`, `cutoutIdle`, `mainImageHovered`, `vignetteStyle`, and optional `geometry*` variants for non-image cutouts.

Six built-in presets live in `hover-effects.ts`: `elevate`, `glow`, `lift`, `subtle`, `trace`, `shimmer`.

Custom effects can declare CSS `@keyframes` via `defineKeyframes(name, css)` — the viewer automatically injects them into `<head>`.

### "use client" Directive

All component files and the library entry point start with `"use client"` for Next.js / React Server Components compatibility. Keep this on any new component files.

### SSR Safety

Always guard canvas/DOM access: `if (typeof document === "undefined") return`. The `"use client"` directive prevents execution on the server in RSC environments, but guards add safety for other SSR setups.

## Making Changes
When making any changes to the library ensure that the public API is considered and updated accordingly.

- Always update the demo app and Storybook stories with any new features or changes to existing features.

## Adding a New Cutout Type

1. Add a new definition interface extending `BaseCutoutDefinition` in `hit-test-strategy.ts` and add it to the `CutoutDefinition` union.
2. Create a new strategy class (e.g., `src/components/cutout-viewer/cutouts/<type>/<type>-hit-test-strategy.ts`) implementing `HitTestStrategy`.
3. Add the new case to `createHitTestStrategy()` in `hit-test-strategy.ts`.
4. Create the React component (e.g., `<type>-cutout.tsx`) that registers the definition via `CutoutRegistryContext` and renders the visual layer.
5. Attach the component to `CutoutViewer` in `cutout-viewer.tsx`.
6. Export types and the component from `src/components/cutout-viewer/index.ts` and `src/index.ts`.

## Adding a New Drawing Tool

Follow the pattern in `drawing/draw-polygon.tsx` + `drawing/use-draw-polygon.ts`:
- The hook handles pointer events, normalizes coordinates, and calls `onComplete` with normalized `[x, y][]` (or equivalent) points.
- The component wraps the hook and renders an SVG overlay.

## Working with Stories (Tests)

Stories live in `cutout-viewer.stories.tsx`. Each story doubles as an interactive test case:
- Import from `@storybook/react-vite`
- Use `play` functions for interaction testing
- Run in a browser context via Playwright, so DOM APIs are available

## Known Gotchas

- **Canvas CORS**: If a cutout image is served from a different origin without CORS headers, `getImageData()` will throw a security error. The `ImageHitTestStrategy` catches this and falls back gracefully (the cutout still renders, hit-testing returns `false`).
- **Storybook tests need Playwright**: `npx playwright install chromium` must be run once before `npx vitest --project storybook` works.
- **No test CI step**: Lint + build are the only automated checks. Always run `npm run lint && npm run build:lib` locally before pushing.
- **Tailwind in demo only**: Tailwind classes appear in `demo/` and `.storybook/` but are not part of the published library. Do not add Tailwind classes to files under `src/components/`.
- **Normalized coordinates**: All coordinates passed to cutout components (bounds, points, center, radius) must be in the 0–1 range relative to the viewer's rendered dimensions, not pixels.
- **Semantic release**: Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.) for `semantic-release` to correctly determine the next version number.
