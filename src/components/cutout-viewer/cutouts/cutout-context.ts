import { createContext, useContext } from "react"
import type { CutoutBounds } from "../hit-test-strategy"
import type { HoverEffect } from "../hover-effects"

export interface CutoutContextValue {
  id: string
  label?: string
  bounds: CutoutBounds
  isActive: boolean
  isHovered: boolean
  isSelected: boolean
  effect: HoverEffect
}

export const CutoutContext = createContext<CutoutContextValue | null>(null)

/**
 * Access the state of the nearest parent `<CutoutViewer.Cutout>`.
 * Must be used inside a `<CutoutViewer.Cutout>`.
 */
export function useCutout() {
  const ctx = useContext(CutoutContext)
  if (!ctx)
    throw new Error("useCutout must be used inside <CutoutViewer.Cutout>")
  return ctx
}
