/**
 * Wallpaper symmetry used by Draw and Photo.
 *
 * Everything is in "units": the tile is `tileW × tileH` units and the app
 * scales one unit to however many pixels the Size slider asks for.
 * Each group is a lattice (where copies sit) plus a set of operations
 * (mirror / turn) applied around every lattice point. Only groups made of
 * mirrors are offered for photos, because mirrors are what make the cut
 * edges of a photo meet without a visible seam.
 */

/** Canvas-style affine matrix [a, b, c, d, e, f]. */
export type Affine = [number, number, number, number, number, number]
export type Point = [number, number]

export type SymmetryId = 'none' | 'mirror' | 'spin' | 'kaleido' | 'honeycomb' | 'triangles'

export interface SymmetryGroup {
  id: SymmetryId
  /** Plain-language name shown in the UI. */
  name: string
  /** One-line description of what it looks like. */
  hint: string
  tileW: number
  tileH: number
  /** Hexagonal lattices have an extra copy in the middle of each tile. */
  centered: boolean
  ops: Affine[]
  /** The slice of picture that gets mirrored (Photo mode only). */
  domain: Point[]
  /** Bounding box of `domain`, from the origin. */
  domainW: number
  domainH: number
}

const I: Affine = [1, 0, 0, 1, 0, 0]
const rot = (deg: number): Affine => {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [c, s, -s, c, 0, 0]
}
/** Mirror across a line through the origin at `deg` degrees. */
const mirror = (deg: number): Affine => {
  const r = (2 * deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [c, s, s, -c, 0, 0]
}

export function multiply(m: Affine, n: Affine): Affine {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

export const apply = (m: Affine, [x, y]: Point): Point => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
]

const SQ3 = Math.sqrt(3)
const range = (n: number, f: (i: number) => Affine) => Array.from({ length: n }, (_, i) => f(i))

export const SYMMETRIES: Record<SymmetryId, SymmetryGroup> = {
  none: {
    id: 'none',
    name: 'Plain',
    hint: 'Repeats as drawn',
    tileW: 1,
    tileH: 1,
    centered: false,
    ops: [I],
    domain: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    domainW: 1,
    domainH: 1,
  },
  mirror: {
    id: 'mirror',
    name: 'Mirror',
    hint: 'Flipped left–right and up–down',
    tileW: 1,
    tileH: 1,
    centered: false,
    ops: [I, mirror(90), mirror(0), rot(180)],
    domain: [
      [0, 0],
      [0.5, 0],
      [0.5, 0.5],
      [0, 0.5],
    ],
    domainW: 0.5,
    domainH: 0.5,
  },
  spin: {
    id: 'spin',
    name: 'Spin',
    hint: 'Turned four ways like a pinwheel',
    tileW: 1,
    tileH: 1,
    centered: false,
    ops: range(4, (i) => rot(i * 90)),
    domain: [
      [0, 0],
      [0.5, 0],
      [0.5, 0.5],
      [0, 0.5],
    ],
    domainW: 0.5,
    domainH: 0.5,
  },
  kaleido: {
    id: 'kaleido',
    name: 'Kaleido',
    hint: 'Eight mirrors, like a kaleidoscope',
    tileW: 1,
    tileH: 1,
    centered: false,
    ops: [...range(4, (i) => rot(i * 90)), ...range(4, (i) => mirror(i * 45))],
    domain: [
      [0, 0],
      [0.5, 0],
      [0.5, 0.5],
    ],
    domainW: 0.5,
    domainH: 0.5,
  },
  honeycomb: {
    id: 'honeycomb',
    name: 'Honeycomb',
    hint: 'Twelve mirrors in a hexagon',
    tileW: 1,
    tileH: SQ3,
    centered: true,
    ops: [...range(6, (i) => rot(i * 60)), ...range(6, (i) => mirror(i * 30))],
    domain: [
      [0, 0],
      [0.5, 0],
      [0.5, 0.5 / SQ3],
    ],
    domainW: 0.5,
    domainH: 0.5 / SQ3,
  },
  triangles: {
    id: 'triangles',
    name: 'Triangles',
    hint: 'Six mirrored triangles',
    tileW: 1,
    tileH: 1 / SQ3,
    centered: true,
    ops: [...range(3, (i) => rot(i * 120)), ...range(3, (i) => mirror(i * 60))],
    domain: [
      [0, 0],
      [1 / 3, 0],
      [1 / 6, SQ3 / 6],
    ],
    domainW: 1 / 3,
    domainH: SQ3 / 6,
  },
}

export const DRAW_SYMMETRIES: SymmetryId[] = ['none', 'mirror', 'spin', 'kaleido', 'honeycomb']
export const PHOTO_SYMMETRIES: SymmetryId[] = ['kaleido', 'mirror', 'honeycomb', 'triangles']

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function transformBox(m: Affine, b: Box): Box {
  const pts = [
    apply(m, [b.minX, b.minY]),
    apply(m, [b.maxX, b.minY]),
    apply(m, [b.minX, b.maxY]),
    apply(m, [b.maxX, b.maxY]),
  ]
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

/**
 * Every lattice offset at which something with bounding box `b` overlaps the
 * tile [0, W] × [0, H]. Drawing at all of them is what makes the tile wrap
 * without a seam: a shape cut by the right edge comes back on the left.
 */
export function latticeOffsets(g: SymmetryGroup, b: Box): Point[] {
  const out: Point[] = []
  const W = g.tileW
  const H = g.tileH
  const shifts: Point[] = g.centered
    ? [
        [0, 0],
        [W / 2, H / 2],
      ]
    : [[0, 0]]
  for (const [sx, sy] of shifts) {
    const i0 = Math.ceil((-b.maxX - sx) / W)
    const i1 = Math.floor((W - b.minX - sx) / W)
    const j0 = Math.ceil((-b.maxY - sy) / H)
    const j1 = Math.floor((H - b.minY - sy) / H)
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) out.push([i * W + sx, j * H + sy])
    }
  }
  return out
}
