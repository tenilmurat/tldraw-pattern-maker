import type { CSSProperties, ReactNode } from 'react'

export interface FrameBox {
  left: number
  top: number
  w: number
  h: number
}

/** Space the style panel takes on wide screens: 320 wide, 12 from the edge, 12 gap. */
const PANEL = 344

/**
 * Where the working frame sits: centred in the space beside the panel,
 * shaped like one tile, never bigger than is comfortable to work in.
 */
export function frameBox(viewW: number, viewH: number, aspect: number, roomForBar: boolean): FrameBox {
  const narrow = viewW <= 720
  const freeW = narrow ? viewW : viewW - PANEL
  const freeH = narrow ? viewH * 0.48 : viewH
  // Room for the label that sits above the frame (the header is outside the preview).
  const top = narrow ? 48 : 64
  const bottom = roomForBar ? (narrow ? 24 : 116) : 48
  const maxW = Math.max(120, Math.min(freeW - 64, 600))
  const maxH = Math.max(120, freeH - top - bottom)
  let w = maxW
  let h = w * aspect
  if (h > maxH) {
    h = maxH
    w = h / aspect
  }
  return { left: Math.round((freeW - w) / 2), top: Math.round(top + (maxH - h) / 2), w: Math.round(w), h: Math.round(h) }
}

/** Light grid lines on light paper, dark on dark. */
function gridFor(paper: string) {
  const n = parseInt(paper.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.5
    ? { minor: 'rgb(0 0 0 / 0.035)', major: 'rgb(0 0 0 / 0.07)' }
    : { minor: 'rgb(255 255 255 / 0.05)', major: 'rgb(255 255 255 / 0.1)' }
}

/**
 * A card on graph paper where you make one tile. Everything behind it is the
 * pattern that tile makes, updating as you work.
 */
export function WorkFrame({
  box,
  paper,
  title,
  hint,
  onHide,
  children,
}: {
  box: FrameBox
  paper: string
  title: string
  hint: string
  onHide: () => void
  children: ReactNode
}) {
  const grid = gridFor(paper)
  const style = {
    left: box.left,
    top: box.top,
    width: box.w,
    height: box.h,
    '--paper': paper,
    '--grid-minor': grid.minor,
    '--grid-major': grid.major,
  } as CSSProperties

  return (
    <div className="work-frame" style={style}>
      <div className="work-frame-label">
        <span>
          <b>{title}</b> {hint}
        </span>
        <button type="button" className="frame-link" onClick={onHide}>
          See whole pattern
        </button>
      </div>
      <div className="work-frame-card">{children}</div>
    </div>
  )
}
