import { createContext, useContext } from "react"
import type { CutoutDefinition, CutoutBounds } from "./hit-test-strategy"
import type { HoverEffect } from "./hover-effects"

export interface CutoutRegistryContextValue {
  registerCutout: (def: CutoutDefinition) => void
  unregisterCutout: (id: string) => void
}

export const CutoutRegistryContext =
  createContext<CutoutRegistryContextValue | null>(null)

export interface CutoutViewerContextValue {
  activeId: string | null
  selectedId: string | null
  hoveredId: string | null
  viewportSize: { width: number; height: number }
  effect: HoverEffect
  enabled: boolean
  showAll: boolean
  boundsMap: Record<string, CutoutBounds>
  isAnyActive: boolean
}

export const CutoutViewerContext = createContext<CutoutViewerContextValue | null>(null)

export function useCutoutViewerContext() {
  const ctx = useContext(CutoutViewerContext)
  if (!ctx) throw new Error("Must be used inside <CutoutViewer>")
  return ctx
}
