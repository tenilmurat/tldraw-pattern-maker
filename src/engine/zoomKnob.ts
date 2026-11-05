import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { drawTileSize } from './draw'
import { photoTileSize } from './photo'
import { customTileSize, shapeSize } from './shapes'

/**
 * Zooming the pattern is the same thing as its size slider: pinch and the
 * slider move together, and a download is exactly what you zoomed to.
 * This is the slider that sets the scale in each mode, and how many pixels
 * one step of it is worth.
 */
export interface ZoomKnob {
  value: number
  min: number
  max: number
  /** On-screen size of the thing that grows, in CSS px, for a slider value. */
  px: (v: number) => number
  set: (v: number) => Action
}

export function zoomKnob(state: PatternState): ZoomKnob {
  const size = (px: (t: number) => number): ZoomKnob => ({
    value: state.size,
    min: 0,
    max: 1,
    px,
    set: (value) => ({ type: 'size', value }),
  })
  switch (state.mode) {
    case 'shapes':
      return size(state.shapes.layout === 'custom' ? customTileSize : shapeSize)
    case 'draw':
      return size(drawTileSize)
    case 'photo':
      return size(photoTileSize)
    case 'paper':
      // Paper has no Size: its line spacing is what makes it bigger or smaller.
      return { value: state.paper.spacingMm, min: 2, max: 15, px: (mm) => mm, set: (mm) => ({ type: 'spacing', mm }) }
  }
}

/** The slider value that makes things `factor` times bigger, kept inside the slider. */
export function zoomedValue(knob: ZoomKnob, from: number, factor: number) {
  const { min, max, px } = knob
  const target = px(from) * factor
  // px is a straight line in every mode, so solve it directly.
  const p0 = px(min)
  const p1 = px(max)
  const v = min + ((target - p0) / (p1 - p0)) * (max - min)
  return Math.min(max, Math.max(min, v))
}
