import type { Palette } from './color'
import { lerp, type Renderer } from './renderer'
import type { PaperKind } from '../state/types'

/** CSS pixels per millimetre (CSS assumes 96 dpi). */
export const PX_PER_MM = 96 / 25.4

export interface PaperInfo {
  id: PaperKind
  name: string
  hint: string
  /** Spacing people expect for this paper, in mm. */
  defaultMm: number
}

export const PAPERS: PaperInfo[] = [
  { id: 'dots', name: 'Dots', hint: 'Bullet-journal dot grid', defaultMm: 5 },
  { id: 'grid', name: 'Squares', hint: 'Maths-book squares', defaultMm: 5 },
  { id: 'graph', name: 'Graph', hint: 'Fine squares, bold every fifth', defaultMm: 2 },
  { id: 'lines', name: 'Lines', hint: 'Ruled notebook', defaultMm: 7 },
  { id: 'music', name: 'Music', hint: 'Five-line staves', defaultMm: 12 },
  { id: 'iso', name: 'Triangles', hint: 'Isometric dots for 3D sketches', defaultMm: 5 },
  { id: 'crosses', name: 'Crosses', hint: 'Small plus marks', defaultMm: 8 },
  { id: 'gingham', name: 'Gingham', hint: 'Picnic-cloth checks', defaultMm: 6 },
]

/** Names for common line spacings, so the number means something. */
export function spacingName(kind: PaperKind, mm: number): string | null {
  if (kind === 'lines') {
    if (Math.abs(mm - 8.7) < 0.4) return 'wide ruled'
    if (Math.abs(mm - 7.1) < 0.4) return 'college ruled'
    if (Math.abs(mm - 6.4) < 0.3) return 'narrow ruled'
  }
  if ((kind === 'grid' || kind === 'dots') && Math.abs(mm - 5) < 0.3) return 'standard'
  return null
}

export interface PaperOptions {
  kind: PaperKind
  spacingMm: number
  weight: number
  palette: Palette
}

export function createPaperRenderer(o: PaperOptions): Renderer {
  const s = o.spacingMm * PX_PER_MM
  const lw = lerp(0.5, 2.6, o.weight)
  const ink = o.palette.inks[0]
  const accent = o.palette.inks[1] ?? ink
  const row = (s * Math.sqrt(3)) / 2

  const tile: Record<PaperKind, [number, number]> = {
    dots: [s, s],
    grid: [s, s],
    graph: [s * 5, s * 5],
    lines: [s, s],
    music: [s, s * 2],
    iso: [s, row * 2],
    crosses: [s, s],
    gingham: [s, s],
  }
  const [tileW, tileH] = tile[o.kind]

  return {
    tileW,
    tileH,
    background: o.palette.paper,
    paint(ctx, x, y, w, h) {
      ctx.fillStyle = o.palette.paper
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = ink
      const i0 = Math.floor(x / s) - 1
      const i1 = Math.ceil((x + w) / s) + 1
      const j0 = Math.floor(y / s) - 1
      const j1 = Math.ceil((y + h) / s) + 1
      const vline = (px: number, width: number) => ctx.fillRect(px - width / 2, y, width, h)
      const hline = (py: number, width: number) => ctx.fillRect(x, py - width / 2, w, width)
      const dot = (px: number, py: number, r: number) => {
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }

      switch (o.kind) {
        case 'dots':
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) dot(i * s, j * s, lw * 0.9)
          break
        case 'grid':
          ctx.globalAlpha = 0.55
          for (let i = i0; i <= i1; i++) vline(i * s, lw * 0.6)
          for (let j = j0; j <= j1; j++) hline(j * s, lw * 0.6)
          break
        case 'graph':
          for (let i = i0; i <= i1; i++) {
            const major = i % 5 === 0
            ctx.globalAlpha = major ? 0.7 : 0.3
            vline(i * s, major ? lw : lw * 0.45)
          }
          for (let j = j0; j <= j1; j++) {
            const major = j % 5 === 0
            ctx.globalAlpha = major ? 0.7 : 0.3
            hline(j * s, major ? lw : lw * 0.45)
          }
          break
        case 'lines':
          ctx.globalAlpha = 0.6
          for (let j = j0; j <= j1; j++) hline(j * s, lw * 0.6)
          break
        case 'music': {
          ctx.globalAlpha = 0.7
          const gap = s / 7
          for (let j = Math.floor(j0 / 2) - 1; j <= Math.ceil(j1 / 2) + 1; j++) {
            for (let n = 0; n < 5; n++) hline(j * s * 2 + s * 0.6 + n * gap, lw * 0.5)
          }
          break
        }
        case 'iso': {
          const r0 = Math.floor(y / row) - 1
          const r1 = Math.ceil((y + h) / row) + 1
          for (let r = r0; r <= r1; r++) {
            const off = r % 2 ? s / 2 : 0
            for (let i = i0; i <= i1; i++) dot(i * s + off, r * row, lw * 0.9)
          }
          break
        }
        case 'crosses': {
          const a = s * 0.14
          for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
              ctx.fillRect(i * s - a, j * s - lw / 2, a * 2, lw)
              ctx.fillRect(i * s - lw / 2, j * s - a, lw, a * 2)
            }
          }
          break
        }
        case 'gingham':
          // Two see-through bands: where they cross, the colour doubles up.
          ctx.fillStyle = accent
          ctx.globalAlpha = 0.38
          for (let i = i0; i <= i1; i++) ctx.fillRect(i * s, y, s / 2, h)
          for (let j = j0; j <= j1; j++) ctx.fillRect(x, j * s, w, s / 2)
          break
      }
      ctx.globalAlpha = 1
    },
  }
}
