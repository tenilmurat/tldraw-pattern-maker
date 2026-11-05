import { reducer } from './reducer'
import type { PatternState } from './types'

/** Where the app keeps your pattern in the browser between visits. */
export const STORAGE_KEY = 'pattern-maker:v2'

/** Come back to the pattern you left. The photo itself isn't stored, only how it was framed. */
export function loadSaved(fallback: PatternState): PatternState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw) as PatternState
    return {
      ...fallback,
      ...saved,
      shapes: { ...fallback.shapes, ...saved.shapes, selected: null },
      draw: { ...fallback.draw, ...saved.draw, past: [], future: [] },
      // Saved before Draw and Paper had colours of their own: they start on white.
      modePalettes: { ...fallback.modePalettes, ...saved.modePalettes },
      photo: { ...saved.photo, src: null, name: 'Sample' },
    }
  } catch {
    return fallback
  }
}

/**
 * Every visit opens on a new pattern: Shapes, with a fresh "Surprise me".
 * Draw, Photo and Paper keep what you left there.
 */
export function openState(fallback: PatternState): PatternState {
  return reducer({ ...loadSaved(fallback), mode: 'shapes' }, { type: 'surprise' })
}
