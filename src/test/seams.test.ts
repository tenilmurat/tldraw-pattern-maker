/**
 * Decision: no seams, ever. Wherever the pattern repeats, the edges meet.
 */
import { describe, expect, test } from 'vitest'
import { LAYOUTS, layoutGrid } from '../engine/shapes'
import {
  apply,
  latticeOffsets,
  multiply,
  PHOTO_SYMMETRIES,
  SYMMETRIES,
  type Affine,
  type SymmetryGroup,
} from '../engine/symmetry'

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6
/** The angle as 0..360, so 0° and 360° count as the same turn. */
const turn = (deg: number) => ((deg % 360) + 360) % 360

describe('Shapes: every layout repeats exactly after one tile', () => {
  for (const { id, name } of LAYOUTS) {
    test(name, () => {
      for (const slots of [1, 2, 3, 4]) {
        for (const space of [0, 0.45, 1]) {
          const g = layoutGrid(id, 40, space, slots, 7)
          const [pi, pj] = g.period
          // A cell and the same cell one whole tile over must hold the same shape,
          // turned and sized the same, exactly one tile width (or height) away.
          for (let i = -3; i < pi + 3; i++) {
            for (let j = -3; j < pj + 3; j++) {
              const a = g.place(i, j)
              for (const [di, dj] of [
                [pi, 0],
                [0, pj],
              ]) {
                const b = g.place(i + di, j + dj)
                expect(close(b.x - a.x, di * g.cw)).toBe(true)
                expect(close(b.y - a.y, dj * g.ch)).toBe(true)
                expect(close(turn(b.rot), turn(a.rot))).toBe(true)
                expect(b.scale).toBe(a.scale)
                expect(b.slot).toBe(a.slot)
              }
            }
          }
        }
      }
    })
  }
})

/** Is `[x, y]` a whole step of the group's repeat (including the middle copy of a hexagonal one)? */
function onLattice(g: SymmetryGroup, [x, y]: [number, number]) {
  const a = (2 * x) / g.tileW
  const b = (2 * y) / g.tileH
  const whole = (v: number) => Math.abs(v - Math.round(v)) < 1e-6
  if (!whole(a) || !whole(b)) return false
  const [m, n] = [Math.round(a), Math.round(b)]
  return g.centered ? (m - n) % 2 === 0 : m % 2 === 0 && n % 2 === 0
}

const sameLinear = (m: Affine, n: Affine) => [0, 1, 2, 3].every((k) => close(m[k], n[k]))

describe('Draw and Photo: every repeat style is a real wallpaper pattern', () => {
  for (const g of Object.values(SYMMETRIES)) {
    test(`${g.name}: its turns and mirrors fit together`, () => {
      // Doing any two of its moves in a row is one of its moves too.
      for (const m of g.ops) {
        for (const n of g.ops) expect(g.ops.some((o) => sameLinear(o, multiply(m, n)))).toBe(true)
      }
    })
    test(`${g.name}: turning or mirroring the repeat lands on the repeat`, () => {
      // If a move took the grid of copies somewhere else, copies would collide at the seams.
      for (const m of g.ops) {
        for (const step of [
          [g.tileW, 0],
          [0, g.tileH],
        ] as [number, number][]) {
          const moved = apply([m[0], m[1], m[2], m[3], 0, 0], step)
          expect(onLattice(g, moved)).toBe(true)
        }
      }
    })
  }

  test('a line crossing the right edge comes back on the left', () => {
    const g = SYMMETRIES.none
    const offsets = latticeOffsets(g, { minX: 0.9, minY: 0.4, maxX: 1.1, maxY: 0.6 })
    expect(offsets).toContainEqual([0, 0])
    expect(offsets).toContainEqual([-1, 0])
  })
})

/** The mirror across the line through p and q, as a matrix. */
function mirrorAcross([px, py]: [number, number], [qx, qy]: [number, number]): Affine {
  const t = Math.atan2(qy - py, qx - px)
  const [c, s] = [Math.cos(2 * t), Math.sin(2 * t)]
  return [c, s, s, -c, px - (c * px + s * py), py - (s * px - c * py)]
}

describe('Photo: the cut edges of the photo always meet themselves', () => {
  test('Photo only offers repeat styles built from mirrors', () => {
    expect(PHOTO_SYMMETRIES).not.toContain('none')
    expect(PHOTO_SYMMETRIES).not.toContain('spin')
  })

  /** Is every edge of the group's slice a mirror line of the pattern? */
  const edgesAreMirrors = (g: SymmetryGroup) =>
    g.domain.every((p, k) => {
      const r = mirrorAcross(p, g.domain[(k + 1) % g.domain.length])
      return g.ops.some((o) => sameLinear(o, r)) && onLattice(g, [r[4], r[5]])
    })

  for (const id of PHOTO_SYMMETRIES) {
    const g = SYMMETRIES[id]
    test(`${g.name}: every edge of the slice is a mirror`, () => {
      // Then the picture on one side of each cut is the mirror image of the other side.
      expect(edgesAreMirrors(g)).toBe(true)
    })
  }

  test('Spin would show seams with a photo, which is why Photo leaves it out', () => {
    expect(edgesAreMirrors(SYMMETRIES.spin)).toBe(false)
  })
})
