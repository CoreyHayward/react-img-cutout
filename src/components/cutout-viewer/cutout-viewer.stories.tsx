import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { CutoutViewer } from "./cutout-viewer"
import type { HoverEffect } from "./hover-effects"

/* ------------------------------------------------------------------ */
/*  Shared demo data                                                   */
/* ------------------------------------------------------------------ */

const MAIN_IMAGE = "/demo-images/main.png"

const CUTOUTS = {
  woman: { id: "woman", src: "/demo-images/woman.png", label: "Woman" },
  man: { id: "man", src: "/demo-images/man.png", label: "Man" },
} as const

/* ------------------------------------------------------------------ */
/*  Meta                                                               */
/* ------------------------------------------------------------------ */

const meta: Meta<typeof CutoutViewer> = {
  title: "Components/CutoutViewer",
  component: CutoutViewer,
  decorators: [
    (Story) => (
      <div style={{ maxHeight: "80vh", maxWidth: "100%", overflow: "auto", display: "inline-block" }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**CutoutViewer** composites a main background image with one or more
transparent-PNG cutout layers and applies pixel-perfect hover effects to each
cutout individually.

### Key features
- **Composable API** — declare cutouts as \`<CutoutViewer.Cutout>\` children,
  each with its own optional \`<CutoutViewer.Overlay>\`.
- **Pixel-accurate hit testing** — only opaque pixels register as hover targets.
- **Five built-in effect presets** — \`elevate\`, \`glow\`, \`lift\`, \`subtle\`, \`trace\`.
- **Per-cutout effect overrides** — each cutout can use a different effect.
- **Fully custom effects** — pass your own \`HoverEffect\` object.
- **Overlay placement** — position overlays relative to the cutout bounding box
  with \`placement\` (e.g. \`top-center\`, \`bottom-left\`, etc.).
- **\`showAll\` mode** — forces every cutout into its active state simultaneously.
        `,
      },
    },
  },
  args: {
    mainImage: MAIN_IMAGE,
    effect: "elevate",
    enabled: true,
    showAll: false,
    alphaThreshold: 30,
  },
  argTypes: {
    effect: {
      control: "select",
      options: ["elevate", "glow", "lift", "subtle", "trace"],
      description:
        "A built-in preset name **or** a custom `HoverEffect` object.",
      table: { defaultValue: { summary: "elevate" } },
    },
    enabled: {
      control: "boolean",
      description: "Toggle all hover interactions and effects.",
      table: { defaultValue: { summary: "true" } },
    },
    showAll: {
      control: "boolean",
      description:
        "Force every cutout into its active state simultaneously — useful as a preview/debug mode.",
      table: { defaultValue: { summary: "false" } },
    },
    alphaThreshold: {
      control: { type: "range", min: 0, max: 255, step: 1 },
      description:
        "Minimum alpha value (0–255) a pixel must have to be counted as a hit target.",
      table: { defaultValue: { summary: "30" } },
    },
    mainImage: { control: "text", description: "URL of the main background image." },
    className: { control: "text" },
    onHover: { action: "hovered" },
    onSelect: { action: "selected" },
    onActiveChange: { action: "activeChanged" },
  },
}

export default meta
type Story = StoryObj<typeof CutoutViewer>

/* ------------------------------------------------------------------ */
/*  Helper: wrap args into composable children                         */
/* ------------------------------------------------------------------ */

const DefaultChildren = () => (
  <>
    <CutoutViewer.Cutout {...CUTOUTS.woman} />
    <CutoutViewer.Cutout {...CUTOUTS.man} />
  </>
)

/* ------------------------------------------------------------------ */
/*  1. Default — Elevate effect                                       */
/* ------------------------------------------------------------------ */

export const ElevateEffect: Story = {
  name: "Elevate Effect (default)",
  render: (args) => (
    <CutoutViewer {...args}>
      <DefaultChildren />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The default **Elevate** effect. The hovered subject lifts " +
          "and receives a blue glow while the background dims and desaturates. " +
          "Click a subject to lock the selection; click again to release.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  2. Glow effect                                                     */
/* ------------------------------------------------------------------ */

export const GlowEffect: Story = {
  args: { effect: "glow" },
  render: (args) => (
    <CutoutViewer {...args}>
      <DefaultChildren />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A warm golden glow highlights the hovered subject. No lift transform — " +
          "the focus is purely via light.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  3. Lift effect                                                     */
/* ------------------------------------------------------------------ */

export const LiftEffect: Story = {
  args: { effect: "lift" },
  render: (args) => (
    <CutoutViewer {...args}>
      <DefaultChildren />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Strong upward lift with a deep shadow. The background dims hard. " +
          "No colour tinting — purely physical depth cues.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  4. Subtle effect                                                   */
/* ------------------------------------------------------------------ */

export const SubtleEffect: Story = {
  args: { effect: "subtle" },
  render: (args) => (
    <CutoutViewer {...args}>
      <DefaultChildren />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Minimal dimming of inactive cutouts. No transforms or colour shifts — " +
          "suitable for use cases where you just need to know which subject the " +
          "cursor is over.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  5. Effects disabled                                                */
/* ------------------------------------------------------------------ */

export const EffectsDisabled: Story = {
  args: { enabled: false },
  render: (args) => (
    <CutoutViewer {...args}>
      <DefaultChildren />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Setting `enabled={false}` renders the viewer as a static composite — " +
          "no hover detection, no transitions. Still useful for display-only contexts.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  6. Show all active                                                 */
/* ------------------------------------------------------------------ */

export const ShowAllActive: Story = {
  args: { showAll: true },
  render: (args) => (
    <CutoutViewer {...args}>
      <DefaultChildren />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "`showAll={true}` forces every cutout into its active/hovered state " +
          "simultaneously. Handy for previews, thumbnails, or an intro animation.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  7. Overlay — floating action button                               */
/* ------------------------------------------------------------------ */

export const WithButtonOverlay: Story = {
  name: "Overlay — Action Button",
  render: (args) => (
    <CutoutViewer {...args}>
      <CutoutViewer.Cutout {...CUTOUTS.woman}>
        <CutoutViewer.Overlay placement="top-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              alert(`Actioned: "Woman" (id: woman)`)
            }}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 18px",
              borderRadius: "9999px",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.45)",
              whiteSpace: "nowrap",
              transform: "translateY(-12px)",
            }}
          >
            ✦ Select Woman
          </button>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
      <CutoutViewer.Cutout {...CUTOUTS.man}>
        <CutoutViewer.Overlay placement="top-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              alert(`Actioned: "Man" (id: man)`)
            }}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 18px",
              borderRadius: "9999px",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.45)",
              whiteSpace: "nowrap",
              transform: "translateY(-12px)",
            }}
          >
            ✦ Select Man
          </button>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Each `<CutoutViewer.Cutout>` composes its own `<CutoutViewer.Overlay>` " +
          "with `placement=\"top-center\"`. The overlay is positioned above the " +
          "cutout's bounding box automatically.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  8. Overlay — name label                                            */
/* ------------------------------------------------------------------ */

export const WithLabelOverlay: Story = {
  name: "Overlay — Name Label",
  render: (args) => (
    <CutoutViewer {...args}>
      <CutoutViewer.Cutout {...CUTOUTS.woman}>
        <CutoutViewer.Overlay placement="bottom-left">
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
              transform: "translateY(8px)",
            }}
          >
            <span style={{ color: "#60a5fa", fontSize: "11px" }}>●</span>
            Woman
          </div>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
      <CutoutViewer.Cutout {...CUTOUTS.man}>
        <CutoutViewer.Overlay placement="bottom-left">
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
              transform: "translateY(8px)",
            }}
          >
            <span style={{ color: "#60a5fa", fontSize: "11px" }}>●</span>
            Man
          </div>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Name badges at the `bottom-left` of each cutout's bounding box. " +
          "Labels are non-interactive (`pointerEvents: none`) so clicks still " +
          "reach the canvas for selection.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  9. Show all + all overlays                                         */
/* ------------------------------------------------------------------ */

export const ShowAllWithLabels: Story = {
  name: "Show All + Labels",
  args: { showAll: true },
  render: (args) => (
    <CutoutViewer {...args}>
      <CutoutViewer.Cutout {...CUTOUTS.woman}>
        <CutoutViewer.Overlay placement="bottom-left">
          <div
            style={{
              pointerEvents: "none",
              padding: "5px 10px",
              borderRadius: "6px",
              background: "rgba(0, 0, 0, 0.7)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              transform: "translateY(8px)",
            }}
          >
            Woman
          </div>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
      <CutoutViewer.Cutout {...CUTOUTS.man}>
        <CutoutViewer.Overlay placement="bottom-left">
          <div
            style={{
              pointerEvents: "none",
              padding: "5px 10px",
              borderRadius: "6px",
              background: "rgba(0, 0, 0, 0.7)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              transform: "translateY(8px)",
            }}
          >
            Man
          </div>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "When `showAll` is active, every cutout's overlay is visible simultaneously.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  10. Custom HoverEffect object                                      */
/* ------------------------------------------------------------------ */

const neonEffect: HoverEffect = {
  name: "neon",
  transition: "all 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
  mainImageHovered: {
    filter: "brightness(0.15) saturate(0)",
  },
  vignetteStyle: {
    background: "rgba(0, 0, 0, 0.55)",
  },
  cutoutActive: {
    transform: "scale(1.03)",
    filter:
      "drop-shadow(0 0 16px rgba(0, 255, 180, 0.85)) drop-shadow(0 0 48px rgba(0, 255, 180, 0.4))",
    opacity: 1,
  },
  cutoutInactive: {
    transform: "scale(1)",
    filter: "brightness(0.15) saturate(0)",
    opacity: 0.25,
  },
  cutoutIdle: {
    transform: "scale(1)",
    filter: "none",
    opacity: 1,
  },
}

export const CustomEffect: Story = {
  name: "Custom HoverEffect Object",
  args: { effect: neonEffect },
  render: (args) => (
    <CutoutViewer {...args}>
      <DefaultChildren />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Pass a fully custom `HoverEffect` object instead of a preset name. " +
          "Every style property is plain CSS, giving complete flexibility. " +
          "This example creates a neon-green glow that bleaches the background mono.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  11. Per-cutout effect override                                     */
/* ------------------------------------------------------------------ */

export const PerCutoutEffect: Story = {
  name: "Per-Cutout Effect Override",
  render: (args) => (
    <CutoutViewer {...args} effect="elevate">
      <CutoutViewer.Cutout {...CUTOUTS.woman} effect="glow">
        <CutoutViewer.Overlay placement="top-center">
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgba(255, 200, 100, 0.9)",
              color: "#000",
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              transform: "translateY(-8px)",
            }}
          >
            Glow effect
          </div>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
      <CutoutViewer.Cutout {...CUTOUTS.man} effect="lift">
        <CutoutViewer.Overlay placement="top-center">
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.9)",
              color: "#000",
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              transform: "translateY(-8px)",
            }}
          >
            Lift effect
          </div>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Each cutout can override the viewer-level effect. Here the woman uses " +
          '`effect="glow"` while the man uses `effect="lift"`, regardless of the ' +
          "viewer's default.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  12. Placement positions demo                                       */
/* ------------------------------------------------------------------ */

export const PlacementPositions: Story = {
  name: "Overlay Placement Positions",
  render: (args) => (
    <CutoutViewer {...args} showAll>
      <CutoutViewer.Cutout {...CUTOUTS.woman}>
        <CutoutViewer.Overlay placement="top-left">
          <Tag>top-left</Tag>
        </CutoutViewer.Overlay>
        <CutoutViewer.Overlay placement="top-center">
          <Tag>top-center</Tag>
        </CutoutViewer.Overlay>
        <CutoutViewer.Overlay placement="top-right">
          <Tag>top-right</Tag>
        </CutoutViewer.Overlay>
        <CutoutViewer.Overlay placement="center-left">
          <Tag>center-left</Tag>
        </CutoutViewer.Overlay>
        <CutoutViewer.Overlay placement="center">
          <Tag>center</Tag>
        </CutoutViewer.Overlay>
        <CutoutViewer.Overlay placement="center-right">
          <Tag>center-right</Tag>
        </CutoutViewer.Overlay>
        <CutoutViewer.Overlay placement="bottom-left">
          <Tag>bottom-left</Tag>
        </CutoutViewer.Overlay>
        <CutoutViewer.Overlay placement="bottom-center">
          <Tag>bottom-center</Tag>
        </CutoutViewer.Overlay>
        <CutoutViewer.Overlay placement="bottom-right">
          <Tag>bottom-right</Tag>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
      <CutoutViewer.Cutout {...CUTOUTS.man} />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates all 9 placement positions on a single cutout. " +
          "Each overlay is positioned relative to the cutout's opaque bounding box.",
      },
    },
  },
}

function Tag({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: "3px 8px",
        borderRadius: "4px",
        background: "rgba(37, 99, 235, 0.85)",
        color: "#fff",
        fontSize: "10px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  13. Callbacks                                                      */
/* ------------------------------------------------------------------ */

export const WithCallbacks: Story = {
  render: (args) => {
    const [log, setLog] = useState<string[]>([])

    const push = (msg: string) =>
      setLog((prev) => [msg, ...prev].slice(0, 6))

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <CutoutViewer
          {...args}
          onHover={(id) => push(`onHover → ${id ?? "null"}`)}
          onSelect={(id) => push(`onSelect → ${id ?? "null"}`)}
          onActiveChange={(id) => push(`onActiveChange → ${id ?? "null"}`)}
        >
          <DefaultChildren />
        </CutoutViewer>
        {/* Event log */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#0f172a",
            color: "#94a3b8",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.7",
            minHeight: "100px",
          }}
        >
          {log.length === 0 ? (
            <span style={{ opacity: 0.5 }}>Hover or click a subject…</span>
          ) : (
            log.map((entry, i) => (
              <div key={i} style={{ opacity: i === 0 ? 1 : 0.5 - i * 0.07 }}>
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "All three callbacks — `onHover`, `onSelect`, and `onActiveChange` — " +
          "are wired to an event log below the viewer. Hover to see `onHover` and " +
          "`onActiveChange` fire; click to lock and see `onSelect`.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  14. Single cutout                                                  */
/* ------------------------------------------------------------------ */

export const SingleCutout: Story = {
  render: (args) => (
    <CutoutViewer {...args}>
      <CutoutViewer.Cutout {...CUTOUTS.woman} />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story: "Works equally well with just one cutout — the background still " +
          "dims on hover and the overlay API functions identically.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  15. BBox Cutout                                                    */
/* ------------------------------------------------------------------ */

export const BBoxCutout: Story = {
  name: "BBox Cutout",
  render: (args) => (
    <CutoutViewer {...args}>
      <CutoutViewer.BBoxCutout
        id="top-left"
        bounds={{ x: 0.02, y: 0.05, w: 0.25, h: 0.2 }}
        label="Top-Left Region"
      >
        <CutoutViewer.Overlay placement="bottom-center">
          <Tag>BBox Region</Tag>
        </CutoutViewer.Overlay>
      </CutoutViewer.BBoxCutout>
      <CutoutViewer.Cutout {...CUTOUTS.woman} />
      <CutoutViewer.Cutout {...CUTOUTS.man} />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "`<CutoutViewer.BBoxCutout>` defines a rectangular region using normalized " +
          "0-1 coordinates. Hit testing uses a simple point-in-rect (AABB) check. " +
          "The default renderer shows a highlighted box on hover.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  16. Polygon Cutout                                                 */
/* ------------------------------------------------------------------ */

export const PolygonCutout: Story = {
  render: (args) => (
    <CutoutViewer {...args}>
      <CutoutViewer.PolygonCutout
        id="ground"
        points={[
          [0.0, 0.85],
          [1.0, 0.85],
          [1.0, 1.0],
          [0.0, 1.0],
        ]}
        label="Ground Area"
      >
        <CutoutViewer.Overlay placement="top-center">
          <Tag>Ground Polygon</Tag>
        </CutoutViewer.Overlay>
      </CutoutViewer.PolygonCutout>
      <CutoutViewer.Cutout {...CUTOUTS.woman} />
      <CutoutViewer.Cutout {...CUTOUTS.man} />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "`<CutoutViewer.PolygonCutout>` defines an arbitrary polygon using normalized " +
          "0-1 coordinate points. Hit testing uses ray-casting (point-in-polygon). " +
          "The default renderer draws an SVG polygon.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  17. Custom renderLayer                                             */
/* ------------------------------------------------------------------ */

export const CustomRenderLayer: Story = {
  name: "Custom renderLayer",
  render: (args) => (
    <CutoutViewer {...args}>
      <CutoutViewer.BBoxCutout
        id="custom-box"
        bounds={{ x: 0.1, y: 0.1, w: 0.35, h: 0.5 }}
        label="Custom SVG Box"
        renderLayer={({ isActive, bounds }) => (
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
        <CutoutViewer.Overlay placement="top-center">
          <Tag>Custom SVG</Tag>
        </CutoutViewer.Overlay>
      </CutoutViewer.BBoxCutout>
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The `renderLayer` prop replaces the default cutout visual with a custom " +
          "renderer. This example draws a green SVG rect with dashed border when " +
          "idle and a solid border when active. Works with all cutout types.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  18. Mixed cutout types                                             */
/* ------------------------------------------------------------------ */

export const MixedCutoutTypes: Story = {
  render: (args) => (
    <CutoutViewer {...args}>
      <CutoutViewer.Cutout {...CUTOUTS.woman}>
        <CutoutViewer.Overlay placement="top-center">
          <Tag>Image</Tag>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
      <CutoutViewer.Cutout {...CUTOUTS.man}>
        <CutoutViewer.Overlay placement="top-center">
          <Tag>Image</Tag>
        </CutoutViewer.Overlay>
      </CutoutViewer.Cutout>
      <CutoutViewer.BBoxCutout
        id="bbox-region"
        bounds={{ x: 0.02, y: 0.05, w: 0.25, h: 0.2 }}
        label="BBox Region"
      >
        <CutoutViewer.Overlay placement="bottom-center">
          <Tag>BBox</Tag>
        </CutoutViewer.Overlay>
      </CutoutViewer.BBoxCutout>
      <CutoutViewer.PolygonCutout
        id="polygon-region"
        points={[
          [0.0, 0.85],
          [1.0, 0.85],
          [1.0, 1.0],
          [0.0, 1.0],
        ]}
        label="Ground Polygon"
      >
        <CutoutViewer.Overlay placement="top-center">
          <Tag>Polygon</Tag>
        </CutoutViewer.Overlay>
      </CutoutViewer.PolygonCutout>
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "All three cutout types — image, bounding box, and polygon — can be mixed " +
          "freely within the same `<CutoutViewer>`. Each uses its own hit-test strategy " +
          "but shares the same hover/selection state and effect system.",
      },
    },
  },
}

/* ------------------------------------------------------------------ */
/*  19. Playground                                                     */
/* ------------------------------------------------------------------ */

export const Playground: Story = {
  name: "⚡ Playground",
  render: (args) => (
    <CutoutViewer {...args}>
      <DefaultChildren />
    </CutoutViewer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Use the **Controls** panel below to tweak every prop interactively.",
      },
    },
  },
}
