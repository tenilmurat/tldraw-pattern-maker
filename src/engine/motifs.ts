import catalog from '../../data/motifs.json'

/** Raw SVG text for every file in data/motifs, keyed by path. */
const files = import.meta.glob('../../data/motifs/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface Motif {
  id: string
  name: string
  /** Original SVG markup (24×24, fill = currentColor), used for the picker icons. */
  svg: string
  /** Canvas path in the same 24-unit box. */
  path: Path2D
}

const num = (el: Element, attr: string) => Number(el.getAttribute(attr) ?? 0)

/**
 * Turn simple SVG markup into one Path2D. Stroked circles (the ring) become an
 * annulus so every motif can be drawn with a single fill call.
 */
function svgToPath(svg: string): Path2D {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const out = new Path2D()
  for (const el of doc.querySelectorAll('path, circle, rect, ellipse, polygon')) {
    const stroked = el.getAttribute('fill') === 'none' && el.hasAttribute('stroke')
    const sw = num(el, 'stroke-width') || 1
    switch (el.tagName) {
      case 'path':
        out.addPath(new Path2D(el.getAttribute('d') ?? ''))
        break
      case 'circle': {
        const [cx, cy, r] = [num(el, 'cx'), num(el, 'cy'), num(el, 'r')]
        if (stroked) {
          out.moveTo(cx + r + sw / 2, cy)
          out.arc(cx, cy, r + sw / 2, 0, Math.PI * 2)
          out.moveTo(cx + r - sw / 2, cy)
          out.arc(cx, cy, r - sw / 2, 0, Math.PI * 2, true)
        } else {
          out.moveTo(cx + r, cy)
          out.arc(cx, cy, r, 0, Math.PI * 2)
        }
        break
      }
      case 'ellipse':
        out.ellipse(num(el, 'cx'), num(el, 'cy'), num(el, 'rx'), num(el, 'ry'), 0, 0, Math.PI * 2)
        break
      case 'rect':
        out.rect(num(el, 'x'), num(el, 'y'), num(el, 'width'), num(el, 'height'))
        break
      case 'polygon': {
        const pts = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number)
        for (let i = 0; i < pts.length; i += 2) {
          if (i === 0) out.moveTo(pts[i], pts[i + 1])
          else out.lineTo(pts[i], pts[i + 1])
        }
        out.closePath()
        break
      }
    }
  }
  return out
}

export const MOTIFS: Motif[] = catalog.motifs.map((m) => {
  const svg = files[`../../data/${m.file}`]
  return { id: m.id, name: m.name, svg, path: svgToPath(svg) }
})

export const MOTIF_BY_ID = new Map(MOTIFS.map((m) => [m.id, m]))
