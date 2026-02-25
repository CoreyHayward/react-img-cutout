import { useState, useCallback } from "react"
import {
  CutoutViewer,
  type HoverEffectPreset,
  type Placement,
  type RenderLayerProps,
} from "../src/components/cutout-viewer"

/* ------------------------------------------------------------------ */
/*  Demo images (served from /public)                                  */
/* ------------------------------------------------------------------ */

const MAIN_IMAGE = "/demo-images/main.png"

const CUTOUTS = {
  woman: { id: "woman", src: "/demo-images/woman.png", label: "Woman" },
  man: { id: "man", src: "/demo-images/man.png", label: "Man" },
} as const

const EFFECTS: HoverEffectPreset[] = ["elevate", "glow", "lift", "subtle", "trace"]

const PLACEMENTS: Placement[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]

type DemoMode = "image" | "bbox" | "polygon" | "renderLayer" | "mixed"

const DEMO_MODES: { value: DemoMode; label: string }[] = [
  { value: "image", label: "Image Cutouts" },
  { value: "bbox", label: "BBox Cutouts" },
  { value: "polygon", label: "Polygon Cutouts" },
  { value: "renderLayer", label: "Custom renderLayer" },
  { value: "mixed", label: "Mixed (All Types)" },
]

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export function App() {
  // Controls state
  const [effect, setEffect] = useState<HoverEffectPreset>("apple")
  const [enabled, setEnabled] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [showOverlays, setShowOverlays] = useState(false)
  const [overlayPlacement, setOverlayPlacement] = useState<Placement>("top-center")
  const [alphaThreshold, setAlphaThreshold] = useState(30)
  const [demoMode, setDemoMode] = useState<DemoMode>("image")

  // Event log
  const [log, setLog] = useState<string[]>([])
  const push = useCallback(
    (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 8)),
    [],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          react-img-cutout
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Interactive demo — toggle the controls below to test each feature branch.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Viewer */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
            <CutoutViewer
              mainImage={MAIN_IMAGE}
              effect={effect}
              enabled={enabled}
              showAll={showAll}
              alphaThreshold={alphaThreshold}
              onHover={(id) => push(`onHover → ${id ?? "null"}`)}
              onSelect={(id) => push(`onSelect → ${id ?? "null"}`)}
              onActiveChange={(id) => push(`onActiveChange → ${id ?? "null"}`)}
            >
              {/* Image cutouts (classic) */}
              {(demoMode === "image" || demoMode === "mixed") && (
                <>
                  <CutoutViewer.Cutout {...CUTOUTS.woman}>
                    {showOverlays && (
                      <CutoutViewer.Overlay placement={overlayPlacement}>
                        <OverlayTag>Woman</OverlayTag>
                      </CutoutViewer.Overlay>
                    )}
                  </CutoutViewer.Cutout>
                  <CutoutViewer.Cutout {...CUTOUTS.man}>
                    {showOverlays && (
                      <CutoutViewer.Overlay placement={overlayPlacement}>
                        <OverlayTag>Man</OverlayTag>
                      </CutoutViewer.Overlay>
                    )}
                  </CutoutViewer.Cutout>
                </>
              )}

              {/* BBox cutouts */}
              {(demoMode === "bbox" || demoMode === "mixed") && (
                <CutoutViewer.BBoxCutout
                  id="sign-region"
                  bounds={{ x: 0.02, y: 0.05, w: 0.25, h: 0.2 }}
                  label="Top-Left Region"
                >
                  {showOverlays && (
                    <CutoutViewer.Overlay placement={overlayPlacement}>
                      <OverlayTag>BBox Region</OverlayTag>
                    </CutoutViewer.Overlay>
                  )}
                </CutoutViewer.BBoxCutout>
              )}

              {/* Polygon cutouts */}
              {(demoMode === "polygon" || demoMode === "mixed") && (
                <CutoutViewer.PolygonCutout
                  id="ground-area"
                  points={[
                    [0.0, 0.85],
                    [1.0, 0.85],
                    [1.0, 1.0],
                    [0.0, 1.0],
                  ]}
                  label="Ground Area"
                >
                  {showOverlays && (
                    <CutoutViewer.Overlay placement={overlayPlacement}>
                      <OverlayTag>Polygon Region</OverlayTag>
                    </CutoutViewer.Overlay>
                  )}
                </CutoutViewer.PolygonCutout>
              )}

              {/* renderLayer — custom SVG renderer */}
              {demoMode === "renderLayer" && (
                <>
                  <CutoutViewer.BBoxCutout
                    id="custom-box"
                    bounds={{ x: 0.1, y: 0.1, w: 0.35, h: 0.5 }}
                    label="Custom Box Renderer"
                    renderLayer={({ isActive, bounds }: RenderLayerProps) => (
                      <svg
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                        }}
                      >
                        <rect
                          x={`${bounds.x * 100}%`}
                          y={`${bounds.y * 100}%`}
                          width={`${bounds.w * 100}%`}
                          height={`${bounds.h * 100}%`}
                          fill={isActive ? "rgba(34, 197, 94, 0.12)" : "transparent"}
                          stroke={isActive ? "#22c55e" : "rgba(255,255,255,0.2)"}
                          strokeWidth={2}
                          strokeDasharray={isActive ? "none" : "6 4"}
                          rx={8}
                        />
                      </svg>
                    )}
                  >
                    {showOverlays && (
                      <CutoutViewer.Overlay placement={overlayPlacement}>
                        <OverlayTag>Custom SVG Box</OverlayTag>
                      </CutoutViewer.Overlay>
                    )}
                  </CutoutViewer.BBoxCutout>

                  <CutoutViewer.PolygonCutout
                    id="custom-poly"
                    points={[
                      [0.55, 0.15],
                      [0.9, 0.15],
                      [0.95, 0.5],
                      [0.7, 0.65],
                      [0.5, 0.45],
                    ]}
                    label="Custom Polygon Renderer"
                    renderLayer={({ isActive, bounds }: RenderLayerProps) => (
                      <div
                        style={{
                          position: "absolute",
                          left: `${bounds.x * 100}%`,
                          top: `${bounds.y * 100}%`,
                          width: `${bounds.w * 100}%`,
                          height: `${bounds.h * 100}%`,
                          background: isActive
                            ? "rgba(168, 85, 247, 0.15)"
                            : "transparent",
                          border: isActive
                            ? "2px solid rgba(168, 85, 247, 0.6)"
                            : "2px dashed rgba(255,255,255,0.15)",
                          borderRadius: "12px",
                          transition: "all 0.3s ease",
                        }}
                      />
                    )}
                  >
                    {showOverlays && (
                      <CutoutViewer.Overlay placement={overlayPlacement}>
                        <OverlayTag>Custom Div Polygon</OverlayTag>
                      </CutoutViewer.Overlay>
                    )}
                  </CutoutViewer.PolygonCutout>
                </>
              )}
            </CutoutViewer>
          </div>

          {/* Event log */}
          <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs leading-relaxed text-neutral-500">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              Event Log
            </div>
            {log.length === 0 ? (
              <span className="opacity-50">Hover or click a subject…</span>
            ) : (
              log.map((entry, i) => (
                <div
                  key={i}
                  style={{ opacity: i === 0 ? 1 : Math.max(0.15, 0.6 - i * 0.07) }}
                >
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls panel */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="sticky top-8 space-y-6 rounded-xl border border-neutral-800 bg-neutral-950 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Controls
            </h2>

            {/* Effect preset */}
            <Field label="Effect preset">
              <div className="flex flex-wrap gap-1.5">
                {EFFECTS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEffect(e)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      effect === e
                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                        : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Field>

            {/* Demo mode */}
            <Field label="Cutout type">
              <div className="flex flex-wrap gap-1.5">
                {DEMO_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setDemoMode(m.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      demoMode === m.value
                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                        : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* Enabled toggle */}
            <Field label="Enabled">
              <Toggle checked={enabled} onChange={setEnabled} />
            </Field>

            {/* Show all toggle */}
            <Field label="Show all">
              <Toggle checked={showAll} onChange={setShowAll} />
            </Field>

            {/* Overlays toggle */}
            <Field label="Show overlays">
              <Toggle checked={showOverlays} onChange={setShowOverlays} />
            </Field>

            {/* Overlay placement */}
            {showOverlays && (
              <Field label="Overlay placement">
                <select
                  value={overlayPlacement}
                  onChange={(e) => setOverlayPlacement(e.target.value as Placement)}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-300 focus:border-blue-500 focus:outline-none"
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Alpha threshold slider */}
            <Field label={`Alpha threshold: ${alphaThreshold}`}>
              <input
                type="range"
                min={0}
                max={255}
                step={1}
                value={alphaThreshold}
                onChange={(e) => setAlphaThreshold(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </Field>

            {/* Reset */}
            <button
              onClick={() => {
                setEffect("apple")
                setEnabled(true)
                setShowAll(false)
                setShowOverlays(false)
                setOverlayPlacement("top-center")
                setAlphaThreshold(30)
                setDemoMode("image")
                setLog([])
              }}
              className="w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:border-neutral-500 hover:text-neutral-200"
            >
              Reset defaults
            </button>
          </div>
        </aside>
      </div>

      {/* Quick-reference docs */}
      <section className="mt-12 space-y-6 rounded-xl border border-neutral-800 bg-neutral-950 p-6">
        <h2 className="text-lg font-semibold text-white">Quick Reference</h2>

        <div className="space-y-4 text-sm leading-relaxed text-neutral-400">
          <div>
            <h3 className="mb-1 font-medium text-neutral-200">Basic usage</h3>
            <Code>{`<CutoutViewer mainImage="/photo.png" effect="apple">
  <CutoutViewer.Cutout id="subject" src="/subject.png" label="Subject" />
</CutoutViewer>`}</Code>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">BBox cutout</h3>
            <Code>{`<CutoutViewer mainImage="/photo.png">
  <CutoutViewer.BBoxCutout
    id="region"
    bounds={{ x: 0.1, y: 0.1, w: 0.3, h: 0.4 }}
    label="Region"
  />
</CutoutViewer>`}</Code>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">Polygon cutout</h3>
            <Code>{`<CutoutViewer mainImage="/photo.png">
  <CutoutViewer.PolygonCutout
    id="lake"
    points={[[0.1, 0.7], [0.4, 0.65], [0.5, 0.85], [0.05, 0.9]]}
    label="Lake"
  />
</CutoutViewer>`}</Code>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">Custom renderLayer</h3>
            <Code>{`<CutoutViewer.BBoxCutout
  id="zone"
  bounds={{ x: 0.2, y: 0.3, w: 0.4, h: 0.3 }}
  renderLayer={({ isActive, bounds }) => (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect
        x={\`\${bounds.x * 100}%\`}
        y={\`\${bounds.y * 100}%\`}
        width={\`\${bounds.w * 100}%\`}
        height={\`\${bounds.h * 100}%\`}
        stroke={isActive ? "#22c55e" : "transparent"}
        fill="none"
      />
    </svg>
  )}
/>`}</Code>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">With overlays</h3>
            <Code>{`<CutoutViewer mainImage="/photo.png">
  <CutoutViewer.Cutout id="face" src="/face.png" label="Face">
    <CutoutViewer.Overlay placement="top-center">
      <button>View Profile</button>
    </CutoutViewer.Overlay>
  </CutoutViewer.Cutout>
</CutoutViewer>`}</Code>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">Mixed cutout types</h3>
            <Code>{`<CutoutViewer mainImage="/scene.jpg">
  <CutoutViewer.Cutout id="person" src="/person.png" label="Person" />
  <CutoutViewer.BBoxCutout
    id="sign"
    bounds={{ x: 0.6, y: 0.1, w: 0.15, h: 0.08 }}
    label="Sign"
  />
  <CutoutViewer.PolygonCutout
    id="lake"
    points={[[0.1, 0.7], [0.4, 0.65], [0.5, 0.85]]}
    label="Lake"
  />
</CutoutViewer>`}</Code>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">Props</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500">
                    <th className="pb-2 pr-4 font-medium">Prop</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Default</th>
                    <th className="pb-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-400">
                  <PropRow prop="mainImage" type="string" def="—" desc="URL of the main background image" />
                  <PropRow prop="effect" type='"apple" | "glow" | "lift" | "subtle" | "trace" | HoverEffect' def='"apple"' desc="Hover effect preset or custom object" />
                  <PropRow prop="enabled" type="boolean" def="true" desc="Toggle hover interactions" />
                  <PropRow prop="showAll" type="boolean" def="false" desc="Force all cutouts into active state" />
                  <PropRow prop="alphaThreshold" type="number (0-255)" def="30" desc="Min alpha for pixel hit-testing" />
                  <PropRow prop="onHover" type="(id: string | null) => void" def="—" desc="Fires when hover changes" />
                  <PropRow prop="onSelect" type="(id: string | null) => void" def="—" desc="Fires on click selection" />
                  <PropRow prop="onActiveChange" type="(id: string | null) => void" def="—" desc="Fires when active cutout changes" />
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">Cutout components</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500">
                    <th className="pb-2 pr-4 font-medium">Component</th>
                    <th className="pb-2 pr-4 font-medium">Key Props</th>
                    <th className="pb-2 font-medium">Hit Test</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-400">
                  <tr className="border-b border-neutral-800/50">
                    <td className="py-1.5 pr-4 font-mono text-blue-400">Cutout</td>
                    <td className="py-1.5 pr-4 font-mono text-neutral-500">id, src, label, renderLayer?</td>
                    <td className="py-1.5">Alpha-channel pixel read</td>
                  </tr>
                  <tr className="border-b border-neutral-800/50">
                    <td className="py-1.5 pr-4 font-mono text-blue-400">BBoxCutout</td>
                    <td className="py-1.5 pr-4 font-mono text-neutral-500">{"id, bounds {x,y,w,h}, label, renderLayer?"}</td>
                    <td className="py-1.5">Point-in-rect (AABB)</td>
                  </tr>
                  <tr className="border-b border-neutral-800/50">
                    <td className="py-1.5 pr-4 font-mono text-blue-400">PolygonCutout</td>
                    <td className="py-1.5 pr-4 font-mono text-neutral-500">id, points [[x,y]...], label, renderLayer?</td>
                    <td className="py-1.5">Ray-cast point-in-polygon</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">Effect presets</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong className="text-neutral-300">apple</strong> — Lifts and blue-glows hovered subject, dims background</li>
              <li><strong className="text-neutral-300">glow</strong> — Warm golden glow, no lift transform</li>
              <li><strong className="text-neutral-300">lift</strong> — Strong upward lift with deep shadow</li>
              <li><strong className="text-neutral-300">subtle</strong> — Minimal dimming, no transforms</li>
              <li><strong className="text-neutral-300">trace</strong> — White outline glow, deep background dim</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-1 font-medium text-neutral-200">Overlay placements</h3>
            <p>
              <code className="text-neutral-300">top-left</code>,{" "}
              <code className="text-neutral-300">top-center</code>,{" "}
              <code className="text-neutral-300">top-right</code>,{" "}
              <code className="text-neutral-300">center-left</code>,{" "}
              <code className="text-neutral-300">center</code>,{" "}
              <code className="text-neutral-300">center-right</code>,{" "}
              <code className="text-neutral-300">bottom-left</code>,{" "}
              <code className="text-neutral-300">bottom-center</code>,{" "}
              <code className="text-neutral-300">bottom-right</code>
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-8 pb-8 text-center text-xs text-neutral-600">
        react-img-cutout v0.1.0
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared small components                                            */
/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-neutral-400">{label}</div>
      {children}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-blue-600" : "bg-neutral-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

function OverlayTag({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "8px",
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
        color: "#fff",
        fontSize: "13px",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "#60a5fa", fontSize: "11px" }}>●</span>
      {children}
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs leading-relaxed text-neutral-300">
      <code>{children}</code>
    </pre>
  )
}

function PropRow({
  prop,
  type,
  def,
  desc,
}: {
  prop: string
  type: string
  def: string
  desc: string
}) {
  return (
    <tr className="border-b border-neutral-800/50">
      <td className="py-1.5 pr-4 font-mono text-blue-400">{prop}</td>
      <td className="py-1.5 pr-4 font-mono text-neutral-500">{type}</td>
      <td className="py-1.5 pr-4 font-mono">{def}</td>
      <td className="py-1.5">{desc}</td>
    </tr>
  )
}
