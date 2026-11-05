/**
 * What a first-time visitor sees: a clean Draw page, the tour in its order,
 * and the logo's hover credit.
 */
import { describe, expect, test } from 'vitest'
import raw from '../assets/logo.svg?raw'
import { TOUR_STEPS } from '../components/tourSteps'
import { BYLINE, logoWords, parseLogo, SWAP_LENGTH, SWEEP_COLOURS, swapFrame, swapLength } from '../logo/motion'
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
  const words = logoWords(paths)

  test('hovering ends on "designed by Murat", in Inter Regular, as one line', () => {
    const end = swapFrame(swapLength(BYLINE), paths, words, BYLINE)
    expect(BYLINE).toHaveLength(1)
    expect(end).toContain('designed by Murat')
    expect(end).toContain('font-weight="400"')
    expect(end).not.toContain(paths.tldraw)
  })

  test('leaving ends back on "tldraw pattern"', () => {
    const end = swapFrame(SWAP_LENGTH, paths, BYLINE, words)
    expect(end).toContain(paths.tldraw)
    expect(end).toContain(paths.pattern)
    expect(end).not.toContain('designed by Murat')
  })

  test('once it has arrived, a colour band sweeps through the credit, like Surprise me on build.studiorekt.com', () => {
    const mid = swapFrame(1.0, paths, words, BYLINE)
    for (const c of SWEEP_COLOURS) expect(mid).toContain(c)
    expect(mid).toContain('fill="url(#logo-in-0-sweep)"')
  })

  test('the band moves left to right, then the credit settles on plain ink', () => {
    const bandLeft = (t: number) => Number(swapFrame(t, paths, words, BYLINE).match(/<linearGradient[^>]* x1="([-\d.]+)"/)![1])
    expect(bandLeft(0.8)).toBeLessThan(bandLeft(1.0))
    expect(bandLeft(1.0)).toBeLessThan(bandLeft(1.2))
    const end = swapFrame(swapLength(BYLINE), paths, words, BYLINE)
    expect(end).not.toContain('linearGradient')
  })

  test('going back to "tldraw pattern" has no sweep and takes the usual time', () => {
    expect(swapLength(words)).toBe(SWAP_LENGTH)
    for (const t of [0.3, 0.6, 0.9]) expect(swapFrame(t, paths, BYLINE, words)).not.toContain('linearGradient')
  })

  test('the mark stays put the whole time', () => {
    for (const t of [0, 0.1, 0.3, 0.6, SWAP_LENGTH]) expect(swapFrame(t, paths, words, BYLINE)).toContain(paths.bg)
  })
})
