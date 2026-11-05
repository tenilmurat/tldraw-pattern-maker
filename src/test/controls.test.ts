/**
 * Decisions: plain words, few controls, Surprise me as a starting point,
 * and every visit opening on a new pattern.
 */
import { beforeEach, describe, expect, test } from 'vitest'
import { EXPORTS } from '../engine/export'
import { MOTIFS } from '../engine/motifs'
import { PAPERS } from '../engine/paper'
import { arrangementFrom, LAYOUTS, shapeSize } from '../engine/shapes'
import { PHOTO_SYMMETRIES, SYMMETRIES } from '../engine/symmetry'
import { zoomedValue, zoomKnob } from '../engine/zoomKnob'
import { loadSaved, openState, STORAGE_KEY } from '../state/open'
import { initialState, reducer } from '../state/reducer'
import type { PatternState } from '../state/types'

describe('Plain words, no jargon', () => {
  // Words a pattern designer knows and our user doesn't.
  const JARGON = /tessellat|wallpaper group|lattice|glide|p4m|p6m|p3m1|pmm|cmm|motif|symmetry|oklch|affine/i
  const shown = [
    ...LAYOUTS.flatMap((l) => [l.name, l.hint]),
    ...Object.values(SYMMETRIES).flatMap((g) => [g.name, g.hint]),
    ...PAPERS.flatMap((p) => [p.name, p.hint]),
    ...EXPORTS.flatMap((e) => [e.name, e.hint]),
  ]
  test.each(shown)('"%s"', (words) => expect(words).not.toMatch(JARGON))
})

describe('Few controls', () => {
  test('zooming and the Size slider are the same thing', () => {
    const state: PatternState = { ...initialState, mode: 'shapes', size: 0.3 }
    const knob = zoomKnob(state)
    // Zooming in to twice the size moves the slider to where shapes are twice as big.
    const v = zoomedValue(knob, state.size, 2)
    expect(shapeSize(v)).toBeCloseTo(shapeSize(state.size) * 2, 6)
  })

  test('zoom never pushes the slider past its ends', () => {
    const knob = zoomKnob({ ...initialState, mode: 'shapes', size: 0.9 })
    expect(zoomedValue(knob, 0.9, 10)).toBe(1)
    expect(zoomedValue(knob, 0.9, 0.01)).toBe(0)
  })

  test('on Paper, zoom changes the line spacing in millimetres', () => {
    const knob = zoomKnob({ ...initialState, mode: 'paper', paper: { ...initialState.paper, spacingMm: 5 } })
    expect(zoomedValue(knob, 5, 2)).toBeCloseTo(10, 6)
  })
})

describe('Surprise me always lands on something that looks good', () => {
  const motifIds = new Set(MOTIFS.map((m) => m.id))
  const layoutIds = new Set(LAYOUTS.map((l) => l.id))
  const surprise = (mode: PatternState['mode']) => reducer({ ...initialState, mode }, { type: 'surprise' })

  test('Shapes: one to four different shapes, a preset layout, sizes in range', () => {
    for (let n = 0; n < 300; n++) {
      const s = surprise('shapes')
      expect(s.shapes.active.length).toBeGreaterThanOrEqual(1)
      expect(s.shapes.active.length).toBeLessThanOrEqual(4)
      expect(new Set(s.shapes.active).size).toBe(s.shapes.active.length)
      for (const id of s.shapes.active) expect(motifIds.has(id)).toBe(true)
      expect(layoutIds.has(s.shapes.layout)).toBe(true)
      expect(s.size).toBeGreaterThanOrEqual(0.15)
      expect(s.size).toBeLessThanOrEqual(0.6)
      expect(s.shapes.space).toBeGreaterThanOrEqual(0.15)
      expect(s.shapes.space).toBeLessThanOrEqual(0.75)
    }
  })

  test('Draw: always picks a repeat style, never plain', () => {
    for (let n = 0; n < 100; n++) expect(surprise('draw').draw.symmetry).not.toBe('none')
  })

  test('Photo: only mirror styles, and the slice stays on the photo', () => {
    for (let n = 0; n < 100; n++) {
      const { symmetry, selection } = surprise('photo').photo
      expect(PHOTO_SYMMETRIES).toContain(symmetry)
      expect(selection.cx).toBeGreaterThanOrEqual(0.2)
      expect(selection.cx).toBeLessThanOrEqual(0.8)
      expect(selection.cy).toBeGreaterThanOrEqual(0.2)
      expect(selection.cy).toBeLessThanOrEqual(0.8)
    }
  })

  test('Paper: always something printed, never the plain sheet', () => {
    for (let n = 0; n < 100; n++) expect(surprise('paper').paper.kind).not.toBe('blank')
  })
})

describe('Every visit opens on a new pattern', () => {
  beforeEach(() => localStorage.clear())

  test('a first visit opens on Shapes', () => {
    expect(openState(initialState).mode).toBe('shapes')
  })

  test('two visits get two different patterns', () => {
    const a = openState(initialState)
    const b = openState(initialState)
    expect(a.seed).not.toBe(b.seed)
  })

  test('coming back from Draw still opens on Shapes, and keeps your Draw settings', () => {
    const saved = { ...initialState, mode: 'draw', draw: { ...initialState.draw, symmetry: 'honeycomb' } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const opened = openState(initialState)
    expect(opened.mode).toBe('shapes')
    expect(opened.draw.symmetry).toBe('honeycomb')
  })

  test('a broken save is ignored, not a crash', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadSaved(initialState)).toBe(initialState)
  })
})

describe('Edit your tile', () => {
  test('opening your tile keeps the same shapes, all inside the one tile', () => {
    for (const layout of LAYOUTS.map((l) => l.id)) {
      const o = { ...initialState.shapes, layout, size: 0.32, palette: initialState.palette, seed: 7 }
      const { custom } = arrangementFrom(o)
      expect(custom.stamps.length).toBeGreaterThan(0)
      for (const st of custom.stamps) {
        expect(o.active).toContain(st.motif)
        expect(st.x).toBeGreaterThanOrEqual(0)
        expect(st.x).toBeLessThan(1)
        expect(st.y).toBeGreaterThanOrEqual(0)
        expect(st.y).toBeLessThan(1)
      }
    }
  })
})
