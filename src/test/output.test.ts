/**
 * Decisions: true sizes on export, and a video that loops.
 */
import { describe, expect, test } from 'vitest'
import { WHITE } from '../engine/color'
import { EXPORTS } from '../engine/export'
import { createPaperRenderer, PX_PER_MM } from '../engine/paper'
import { TURN_SPEED, turnAngles, turnFrameCount, wrapAngle } from '../engine/turnVideo'

describe('True sizes', () => {
  const a4 = EXPORTS.find((e) => e.id === 'a4')!

  test('the A4 download is A4 at 300 dpi', () => {
    // 210 × 297 mm at 300 dots per inch.
    expect(a4.width).toBe(Math.round((210 / 25.4) * 300))
    expect(a4.height).toBe(Math.round((297 / 25.4) * 300))
  })

  test('5 mm on the paper grid is really 5 mm on the printed A4', () => {
    const paper = createPaperRenderer({ kind: 'dots', spacingMm: 5, weight: 0.35, palette: WHITE })
    const printedPx = paper.tileW * a4.k
    const printedMm = (printedPx / 300) * 25.4
    expect(printedMm).toBeCloseTo(5, 6)
    expect(PX_PER_MM).toBeCloseTo(96 / 25.4, 9)
  })

  test('every picture size is a size people ask for', () => {
    const sizes = EXPORTS.filter((e) => e.width).map((e) => `${e.width}x${e.height}`)
    expect(sizes).toEqual(['1080x1080', '2048x2048', '1080x1350', '1920x1080', '3840x2160', '2480x3508'])
  })
})

describe('A video that loops', () => {
  const frames = turnFrameCount(30)
  const angles = turnAngles(0, frames)

  test('one full turn takes 8 seconds at 30 frames a second', () => {
    expect(360 / TURN_SPEED).toBe(8)
    expect(frames).toBe(240)
  })

  test('every frame turns by the same small step', () => {
    for (let i = 1; i < frames; i++) {
      expect(wrapAngle(angles[i] - angles[i - 1])).toBeCloseTo(360 / frames, 9)
    }
  })

  test('the last frame stops one step short, so the first frame follows it with no jump', () => {
    // From the last frame to the first is exactly one more step, not zero (a pause) or two (a skip).
    expect(wrapAngle(angles[0] - angles[frames - 1])).toBeCloseTo(360 / frames, 9)
  })

  test('angles stay between -180° and 180°, the same as the turn control', () => {
    for (const a of turnAngles(170, frames)) {
      expect(a).toBeGreaterThanOrEqual(-180)
      expect(a).toBeLessThan(180)
    }
  })
})
