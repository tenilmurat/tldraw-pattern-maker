/**
 * What a first-time visitor sees: a clean Draw page, the tour in its order,
 * and the logo's hover credit.
 */
import { describe, expect, test } from 'vitest'
import raw from '../assets/logo.svg?raw'
import { TOUR_STEPS } from '../components/tourSteps'
import { creditFrame, parseLogo } from '../logo/motion'
import { initialState } from '../state/reducer'

describe('Draw', () => {
  test('opens on a clean page, with no sample drawing', () => {
    expect(initialState.draw.strokes).toEqual([])
  })
})

describe('First-visit tour', () => {
  test('goes: the modes, the panel, Edit your tile, then Download', () => {
    expect(TOUR_STEPS.map((s) => s.target)).toEqual(['.modes', '.panel', '.show-frame', '.actions .button'])
  })

  test('every step has a short title and a short explanation', () => {
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeLessThanOrEqual(30)
      expect(s.body.length).toBeLessThanOrEqual(160)
    }
  })
})

describe('Header logo', () => {
  const paths = parseLogo(raw)

  test('at rest it is the plain logo', () => {
    const rest = creditFrame(0, paths)
    expect(rest).toContain(paths.tldraw)
    expect(rest).toContain(paths.pattern)
    expect(rest).not.toContain('designed by Murat')
  })

  test('fully hovered it shows "designed by Murat" in Inter Regular, as one line, with no colour', () => {
    const credit = creditFrame(1, paths)
    expect(credit).toContain('designed by Murat')
    expect(credit).toContain('font-family="Inter, sans-serif" font-weight="400"')
    expect(credit).not.toContain(paths.tldraw)
    expect(credit).not.toContain(paths.pattern)
    expect(credit).not.toContain('Gradient')
  })

  test('the logo words leave before the credit arrives, so they never overlap', () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const frame = creditFrame(p, paths)
      expect(frame.includes(paths.tldraw) && frame.includes('designed by Murat')).toBe(false)
    }
  })

  test('the mark stays put the whole time', () => {
    for (const p of [0, 0.2, 0.5, 0.8, 1]) expect(creditFrame(p, paths)).toContain(paths.bg)
  })
})
