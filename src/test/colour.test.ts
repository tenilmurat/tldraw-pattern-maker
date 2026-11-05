/**
 * Decision: colour that can't go wrong. Random never means clashing.
 */
import { describe, expect, test } from 'vitest'
import { harmoniousPalette, oklch, PALETTES } from '../engine/color'
import { createRand } from '../engine/random'

const HEX = /^#[0-9a-f]{6}$/

/** WCAG contrast ratio between two colours (1 = none, 21 = black on white). */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The hue of a colour in degrees, from its sRGB channels. */
function hue(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return null
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

const SEEDS = Array.from({ length: 2000 }, (_, i) => i + 1)

describe('New colours (random palettes)', () => {
  test('the same seed always gives the same palette', () => {
    for (const s of SEEDS.slice(0, 50)) {
      expect(harmoniousPalette(createRand(s))).toEqual(harmoniousPalette(createRand(s)))
    }
  })

  test('every colour is a real colour a screen can show', () => {
    for (const s of SEEDS) {
      const p = harmoniousPalette(createRand(s))
      expect(p.paper).toMatch(HEX)
      expect(p.inks).toHaveLength(3)
      for (const ink of p.inks) expect(ink).toMatch(HEX)
    }
  })

  test('the strongest ink always stands out from the paper (4.5:1, the WCAG bar for text)', () => {
    for (const s of SEEDS) {
      const p = harmoniousPalette(createRand(s))
      expect(Math.max(...p.inks.map((i) => contrast(i, p.paper)))).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('the paper is tinted with the same hue as the first ink, so they belong together', () => {
    for (const s of SEEDS) {
      const p = harmoniousPalette(createRand(s))
      const [a, b] = [hue(p.paper), hue(p.inks[0])]
      if (a === null || b === null) continue
      const gap = Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
      expect(gap).toBeLessThan(45)
    }
  })

  test('colours a screen cannot show are toned down, not broken', () => {
    // Far too vivid on purpose: it must still come back as a valid colour.
    for (const h of [0, 60, 120, 180, 240, 300]) expect(oklch(0.7, 0.5, h)).toMatch(HEX)
  })
})

describe('Named palettes', () => {
  test('each has a paper and three inks', () => {
    for (const p of PALETTES) {
      expect(p.paper).toMatch(HEX)
      expect(p.inks).toHaveLength(3)
    }
  })

  test('each has one ink that stands out from its paper (at least 3:1)', () => {
    for (const p of PALETTES) {
      expect(Math.max(...p.inks.map((i) => contrast(i, p.paper)))).toBeGreaterThanOrEqual(3)
    }
  })
})
