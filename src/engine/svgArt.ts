/**
 * Pasted or dropped SVGs, kept as their own markup so they can be recoloured.
 * The markup is only ever shown as an image (never put into the page), so
 * nothing inside it can run.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Does this text look like an SVG file? */
export const isSvgText = (text: string) =>
  /^\uFEFF?\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text) &&
  /<\/svg>\s*$/i.test(text)

function parse(svg: string) {
  // An SVG without its namespace parses as plain XML and won't draw as an image.
  const text = /<svg[^>]*\sxmlns=/i.test(svg) ? svg : svg.replace(/<svg/i, `<svg xmlns="${SVG_NS}"`)
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  if (root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null
  return { doc, root }
}

const num = (v: string | null) => {
  const n = v ? parseFloat(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

/** The SVG's own width and height, from its size or its viewBox. */
export function svgSize(svg: string): { w: number; h: number } {
  const p = parse(svg)
  if (!p) return { w: 100, h: 100 }
  const vb = p.root.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  const vw = vb && vb.length === 4 && vb[2] > 0 ? vb[2] : null
  const vh = vb && vb.length === 4 && vb[3] > 0 ? vb[3] : null
  const w = num(p.root.getAttribute('width')) ?? vw ?? 100
  const h = num(p.root.getAttribute('height')) ?? vh ?? (vw && vh ? (w * vh) / vw : 100)
  return { w, h }
}

const PAINTS = ['fill', 'stroke', 'stop-color', 'color', 'flood-color', 'lighting-color']
const keep = (v: string) => /^\s*(none|transparent)\s*$/i.test(v)

/**
 * Every colour in the SVG becomes `colour`: fills, strokes, gradients and
 * styles alike, while "none" stays none so outlines stay outlines.
 */
export function tintSvg(svg: string, colour: string): string {
  const p = parse(svg)
  if (!p) return svg
  const { doc, root } = p
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const attr of PAINTS) {
      const v = el.getAttribute(attr)
      if (v !== null && !keep(v)) el.setAttribute(attr, colour)
    }
    const style = el.getAttribute('style')
    if (style) el.setAttribute('style', tintCss(style, colour))
    if (el.nodeName.toLowerCase() === 'style' && el.textContent) el.textContent = tintCss(el.textContent, colour)
  }
  // Shapes with no fill of their own are black by default; give them the colour too.
  if (!root.hasAttribute('fill')) root.setAttribute('fill', colour)
  return new XMLSerializer().serializeToString(doc)
}

function tintCss(css: string, colour: string) {
  return css.replace(/(^|[;{\s])(fill|stroke|stop-color|color|flood-color)\s*:\s*([^;}]+)/gi, (m, pre, prop, value) =>
    keep(value) ? m : `${pre}${prop}:${colour}`,
  )
}

/** Lets the SVG stretch with its shape, the way any other shape resizes. */
function stretchable(svg: string) {
  const p = parse(svg)
  if (!p) return svg
  if (p.root.hasAttribute('viewBox')) p.root.setAttribute('preserveAspectRatio', 'none')
  else {
    const { w, h } = svgSize(svg)
    p.root.setAttribute('viewBox', `0 0 ${w} ${h}`)
    p.root.setAttribute('preserveAspectRatio', 'none')
  }
  p.root.setAttribute('width', '100%')
  p.root.setAttribute('height', '100%')
  return new XMLSerializer().serializeToString(p.doc)
}

/** The SVG as an image URL, in its own colours or tinted. */
export function svgUrl(svg: string, colour: string | null) {
  const out = stretchable(colour ? tintSvg(svg, colour) : svg)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(out)}`
}
