# CutoutViewer — Code Review & Improvement Proposals

## Overview

`react-img-cutout` is a well-structured compound-component library that composites a main background image with transparent-PNG cutout layers, applying pixel-accurate hover effects. The current API (`CutoutViewer`, `CutoutViewer.Cutout`, `CutoutViewer.Overlay`) is clean and composable.

This review identifies opportunities to make the library **more extensible**, **more performant**, and **easier to adopt** — with a focus on decoupling the cutout abstraction from its current image-only implementation.

---

## 1. Abstract the Cutout Model (Biggest Win)

### Problem

The entire pipeline — registration, hit testing, bounds computation, and rendering — is hardcoded to transparent PNGs:

- `useCutoutHitTest` loads each cutout as an `Image`, draws it to an offscreen `<canvas>`, and reads pixel alpha on every mouse move.
- The `Cutout` sub-component always renders an `<img>` tag.
- The registry stores `{ src, label }` — src being an image URL.

This means the library can **only** represent cutouts as full-resolution transparent images. Users who want bounding-box regions, SVG paths, polygons, or AI-generated masks have no entry point.

### Proposal — Cutout Strategy / Provider Pattern

Introduce a **`CutoutDefinition`** discriminated union that describes _what_ a cutout is, and a **`CutoutRenderer`** interface that controls _how_ it renders:

```ts
// ---- Cutout definitions (the "what") ----

interface BaseCutoutDefinition {
  id: string;
  label?: string;
}

interface ImageCutoutDefinition extends BaseCutoutDefinition {
  type: "image";
  /** Transparent PNG, same resolution as the main image */
  src: string;
}

interface BoundingBoxCutoutDefinition extends BaseCutoutDefinition {
  type: "bbox";
  /** Normalized 0-1 coordinates */
  bounds: { x: number; y: number; w: number; h: number };
}

interface PolygonCutoutDefinition extends BaseCutoutDefinition {
  type: "polygon";
  /** Array of [x, y] normalized points forming a closed path */
  points: [number, number][];
}

type CutoutDefinition =
  | ImageCutoutDefinition
  | BoundingBoxCutoutDefinition
  | PolygonCutoutDefinition;
```

Each definition type would have a paired **strategy** that handles:

| Responsibility | Image (current) | BoundingBox | Polygon |
|---|---|---|---|
| **Hit test** | Alpha-channel pixel read | Point-in-rect check | Point-in-polygon (ray cast) |
| **Bounds computation** | Scan opaque pixels | Identity (bounds _are_ the definition) | Bounding rect of polygon |
| **Rendering** | `<img>` overlay | Semi-transparent `<div>` or user-supplied renderer | SVG `<polygon>` or user-supplied renderer |

This could be implemented as a strategy map or, more idiomatically in React, as **pluggable sub-components** (see proposal 2).

### Backward-Compatible Path

The existing `<CutoutViewer.Cutout id="x" src="/x.png">` API stays untouched and maps internally to `{ type: "image", ... }`. New cutout types get their own sub-components:

```tsx
<CutoutViewer mainImage="/scene.jpg">
  {/* Existing image-based cutout (unchanged) */}
  <CutoutViewer.Cutout id="person" src="/person.png" label="Person" />

  {/* New: bounding-box cutout */}
  <CutoutViewer.BBoxCutout
    id="sign"
    bounds={{ x: 0.6, y: 0.1, w: 0.15, h: 0.08 }}
    label="Street Sign"
  />

  {/* New: polygon cutout */}
  <CutoutViewer.PolygonCutout
    id="lake"
    points={[[0.1, 0.7], [0.4, 0.65], [0.5, 0.85], [0.05, 0.9]]}
    label="Lake"
  />
</CutoutViewer>
```

---

## 2. Custom Cutout Renderers

### Problem

The `Cutout` component unconditionally renders an `<img>` inside a positioned `<div>`. There's no way for consumers to control what the cutout layer actually looks like — e.g., rendering an SVG highlight, a colored overlay, a lottie animation, or nothing at all.

### Proposal — `renderLayer` Prop or Render-Prop Children

Allow users to supply their own rendering for the cutout layer:

```tsx
// Option A: renderLayer prop
<CutoutViewer.Cutout
  id="region"
  src="/region.png"
  renderLayer={({ isActive, bounds, effect }) => (
    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <rect
        x={`${bounds.x * 100}%`}
        y={`${bounds.y * 100}%`}
        width={`${bounds.w * 100}%`}
        height={`${bounds.h * 100}%`}
        stroke={isActive ? "#2563eb" : "transparent"}
        strokeWidth={2}
        fill="none"
      />
    </svg>
  )}
/>
```

```tsx
// Option B: headless cutout + children render function
<CutoutViewer.HeadlessCutout
  id="zone"
  bounds={{ x: 0.2, y: 0.3, w: 0.4, h: 0.3 }}
>
  {({ isActive, isHovered, bounds }) => (
    <div
      style={{
        position: "absolute",
        left: `${bounds.x * 100}%`,
        top: `${bounds.y * 100}%`,
        width: `${bounds.w * 100}%`,
        height: `${bounds.h * 100}%`,
        border: isActive ? "2px solid cyan" : "1px dashed gray",
        background: isHovered ? "rgba(0,200,255,0.1)" : "transparent",
      }}
    />
  )}
</CutoutViewer.HeadlessCutout>
```

This would let users build annotation tools, object-detection visualizers, image maps, and more — all on top of the same viewer infrastructure.

---

## 3. Decouple Hit Testing from Image Loading

### Problem

`useCutoutHitTest` currently does **three jobs** in one hook:
1. Loads images and builds offscreen `<canvas>` alpha maps
2. Computes bounding boxes by scanning pixels
3. Performs per-mouse-move hit testing

This tight coupling means you can't use the hit-test infrastructure with non-image cutouts.

### Proposal — `HitTestProvider` Abstraction

Split the hook into composable pieces:

```ts
interface HitTestStrategy {
  /** Returns true if the point (nx, ny) in [0,1] is inside this cutout */
  hitTest(nx: number, ny: number): boolean;
  /** Pre-computed bounding box */
  bounds: CutoutBounds;
  /** Optional async setup (e.g., image loading) */
  prepare?(): Promise<void>;
  /** Cleanup */
  dispose?(): void;
}
```

- **`ImageHitTestStrategy`** — current alpha-channel approach (unchanged behavior)
- **`RectHitTestStrategy`** — simple AABB point-in-rect, near-zero cost
- **`PolygonHitTestStrategy`** — ray-casting point-in-polygon

The core `useCutoutHitTest` hook would only care about calling `strategy.hitTest(nx, ny)` — it wouldn't know or care what kind of cutout it's testing.

---

## 4. Performance Improvements

### 4a. Pre-extract Alpha Data into a `Uint8Array`

**Current**: `ctx.getImageData(px, py, 1, 1)` is called on every single mouse-move event for every cutout (back-to-front). Each `getImageData` call has non-trivial overhead due to canvas state serialization.

**Proposed**: Extract the full alpha channel once during `buildAlphaMaps` and store it as a flat `Uint8Array`:

```ts
// During build
const imageData = ctx.getImageData(0, 0, w, h);
const alphaBuffer = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) {
  alphaBuffer[i] = imageData.data[i * 4 + 3];
}

// During hit test (O(1) array lookup instead of getImageData call)
const alpha = alphaBuffer[py * width + px];
return alpha > threshold;
```

This is a **significant** performance improvement for large images or many cutouts, and removes the need to keep offscreen canvases alive.

### 4b. Coarse Bounds Pre-Check

Before doing per-pixel hit testing, check if the mouse is inside the cutout's bounding box first. This is already computed but never used as a fast-reject:

```ts
// Skip pixel-level test if pointer is outside the bounding box
if (nx < bounds.x || nx > bounds.x + bounds.w ||
    ny < bounds.y || ny > bounds.y + bounds.h) {
  continue; // no hit, skip pixel check entirely
}
```

### 4c. Throttle / `requestAnimationFrame` for `mousemove`

Mouse-move events can fire at 60–120+ Hz. Consider throttling hit testing to animation-frame rate at most. Currently every mouse move triggers hit testing synchronously.

---

## 5. Pointer Events Instead of Mouse Events

### Problem

The hook only binds `onMouseMove`, `onMouseLeave`, and `onClick`. This means:
- **Touch devices** get no hover feedback (and taps may not register correctly)
- **Pen/stylus** input is not handled

### Proposal

Replace mouse events with Pointer Events (`onPointerMove`, `onPointerLeave`, `onPointerDown`/`onPointerUp`). Pointer Events are a superset of mouse events and handle all input types uniformly. They're supported in all modern browsers.

For touch specifically, you'd want to treat `pointerdown` → `pointerup` (without significant movement) as a hover+select in a single gesture, since there's no persistent hover state on touch.

---

## 6. Accessibility

### Problem

The viewer has no keyboard interaction, ARIA roles, or focus management. Screen readers see only an `<img>` with alt text — the cutouts are invisible to assistive technology.

### Proposal

- Add `role="img"` (or `role="figure"`) on the container, with `aria-label` describing the scene
- Render hidden but focusable elements for each cutout (or use `role="button"` + `aria-label` on the cutout layers)
- Support `Tab` to cycle through cutouts and `Enter`/`Space` to select
- Fire `onActiveChange` / `onSelect` from keyboard events
- Consider an `aria-live` region that announces which cutout is focused

A minimal approach:

```tsx
<div role="group" aria-label="Interactive image with selectable regions">
  {cutouts.map((c) => (
    <button
      key={c.id}
      aria-label={c.label ?? c.id}
      aria-pressed={selectedId === c.id}
      onFocus={() => setHoveredId(c.id)}
      onBlur={() => setHoveredId(null)}
      onClick={() => toggleSelect(c.id)}
      style={{ /* visually hidden or overlaid on bounds */ }}
    />
  ))}
</div>
```

---

## 7. SSR / RSC Safety

### Problem

`useCutoutHitTest` calls `document.createElement("canvas")` and `new Image()` synchronously inside a `useEffect`, which is safe. However, the `"use client"` directive alone doesn't prevent the module from being imported on the server during SSR bundling. If any code path runs `computeBounds` at module level or during render (not currently the case, but fragile), it would crash.

### Proposal

- Add a guard around canvas creation: `typeof document !== "undefined"`
- Consider lazy-initializing alpha maps only after a first interaction (hover/focus), which also improves initial page load time
- Document SSR compatibility explicitly in the README

---

## 8. Error Handling & Loading States

### Problem

- Image loading errors in `buildAlphaMaps` are silently swallowed (`img.onerror = () => resolve()`)
- There's no way for consumers to know if a cutout image failed to load
- No loading state while alpha maps are being built (large images can take noticeable time)

### Proposal

- Add an `onError` callback: `onError?: (cutoutId: string, error: Error) => void`
- Add a `loading` state to the viewer context so consumers can show a spinner or skeleton
- Consider an `onReady` callback that fires once all alpha maps are built

```tsx
<CutoutViewer
  mainImage="/scene.jpg"
  onError={(id, err) => console.warn(`Cutout ${id} failed:`, err)}
  onReady={() => console.log("All cutouts loaded")}
>
  ...
</CutoutViewer>
```

---

## 9. Smaller API Refinements

### 9a. Support `ref` Forwarding

`CutoutViewerBase` doesn't forward refs. Consumers may need a ref to the container for scroll-into-view, measuring, or integration with other libraries. Use `forwardRef` (or in React 19+, just accept `ref` as a prop) and merge it with the internal `containerRef`.

### 9b. Configurable Z-Index Layer

The hardcoded z-index values (10, 20, 30) can clash with consumer layouts. Consider:

```tsx
<CutoutViewer zIndexBase={100}>
```

Or use CSS `isolation: isolate` on the container to create a local stacking context (this already happens implicitly because of `position: relative` + `overflow: hidden`, but making it explicit is clearer).

### 9c. Export Internal Utilities

`computeBounds`, `getPlacementStyle`, and the `HitTestStrategy` (if extracted) are useful standalone utilities. Consider exporting them for advanced use cases.

### 9d. Allow `className` on `Cutout`

The `Cutout` sub-component accepts no `className` or `style`. Consumers may want to add custom CSS (e.g., for CSS-based animations that go beyond what `HoverEffect` covers).

---

## 10. Extensibility Summary — Cutout Type Matrix

Here's how the proposed abstraction would map to different use cases:

| Use Case | Cutout Type | Hit Test | Renderer | Existing Support |
|---|---|---|---|---|
| Visual Look Up | `image` | Alpha channel | `<img>` overlay | Yes |
| Object detection boxes | `bbox` | Point-in-rect | `<div>` or custom | **No** |
| Segmentation masks | `image` | Alpha channel | `<img>` or `<canvas>` | Partial |
| Geographic regions | `polygon` | Ray cast | SVG `<polygon>` | **No** |
| Annotation / labeling | `bbox` or `polygon` | Rect or polygon | Custom renderer | **No** |
| Headless (data only) | Any | Any | None (render-prop) | **No** |

---

## Prioritized Recommendations

| Priority | Item | Effort | Impact |
|---|---|---|---|
| **P0** | Pre-extract alpha into `Uint8Array` + bounds pre-check (4a, 4b) | Small | High perf win |
| **P0** | Switch to Pointer Events (5) | Small | Unlocks touch/pen |
| **P1** | Abstract `CutoutDefinition` union type + `BBoxCutout` variant (1) | Medium | Major extensibility |
| **P1** | Decouple hit-test strategies (3) | Medium | Enables all new cutout types |
| **P1** | `renderLayer` prop for custom cutout rendering (2) | Small | High flexibility |
| **P2** | Accessibility — keyboard nav + ARIA (6) | Medium | Compliance & usability |
| **P2** | Error/loading callbacks (8) | Small | Better DX |
| **P3** | SSR guards (7) | Tiny | Safety net |
| **P3** | Ref forwarding, z-index config, className on Cutout (9) | Tiny each | Polish |

---

## Conclusion

The core library is solid — the compound-component pattern, the composable Overlay placement system, and the preset/custom effect approach are all well-designed. The main bottleneck is that **cutout = transparent PNG** is baked into every layer of the architecture. Introducing a `CutoutDefinition` abstraction with pluggable hit-test strategies and renderers would transform this from an image-effect library into a general-purpose **interactive region** library — while keeping the existing image-based API completely intact.
