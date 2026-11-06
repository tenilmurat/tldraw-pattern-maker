import { useEffect, useRef } from 'react'
import raw from '../assets/logo.svg?raw'
import { creditFrame, LOGO, parseLogo, SWAP_LENGTH } from './motion'

const PATHS = parseLogo(raw)
const STILL = creditFrame(0, PATHS)

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The header logo. Hover it and "tldraw pattern" gives way to a credit,
 * "designed by Murat"; leave and the logo comes back. The swap follows the
 * mouse: it heads for the credit while you're over the logo and back as soon
 * as you leave, turning around from wherever it is, so nothing waits to
 * finish and nothing is left half drawn.
 */
export function LogoMark({ height = 24 }: { height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  // How far the swap has gone (0 = logo, 1 = credit), and where it's heading.
  const at = useRef(0)
  const target = useRef(0)
  // The frame loop while it moves, and a safety timer in case frames stop coming.
  const loop = useRef<{ raf: number; last: number } | null>(null)
  const safety = useRef(0)

  const draw = () => {
    if (ref.current) ref.current.innerHTML = creditFrame(at.current, PATHS)
  }

  const stop = () => {
    if (loop.current) cancelAnimationFrame(loop.current.raf)
    loop.current = null
    clearTimeout(safety.current)
  }

  /** Jump straight to where it's heading: the end of a move, or the safety net. */
  const land = () => {
    stop()
    at.current = target.current
    draw()
  }

  const step = (now: number) => {
    const run = loop.current
    // A frame that arrives after the move has ended must not draw over it.
    if (!run) return
    const move = Math.max(0, now - run.last) / 1000 / SWAP_LENGTH
    run.last = now
    const dir = Math.sign(target.current - at.current)
    at.current += dir * move
    if (dir === 0 || (target.current - at.current) * dir <= 0) return land()
    draw()
    run.raf = requestAnimationFrame(step)
  }

  const head = (to: number) => {
    target.current = to
    if (reducedMotion()) return land()
    // Wherever it is now, it can't need longer than one full swap to get there.
    clearTimeout(safety.current)
    safety.current = window.setTimeout(land, SWAP_LENGTH * 1000 + 300)
    if (!loop.current) loop.current = { raf: requestAnimationFrame(step), last: performance.now() }
  }

  // A backup for a missed "leave": while the credit is showing or on its way,
  // any mouse movement outside the logo sends it back.
  const watchOut = useRef<((e: PointerEvent) => void) | null>(null)
  const unwatch = () => {
    if (watchOut.current) document.removeEventListener('pointermove', watchOut.current)
    watchOut.current = null
  }
  const watch = () => {
    if (watchOut.current) return
    watchOut.current = (e: PointerEvent) => {
      const svg = ref.current
      if (svg && e.target instanceof Node && svg.contains(e.target)) return
      unwatch()
      head(0)
    }
    document.addEventListener('pointermove', watchOut.current)
  }

  // Leaving the page mid-swap must not leave a frame loop, timer or listener running.
  useEffect(
    () => () => {
      stop()
      unwatch()
    },
    [],
  )

  return (
    <svg
      ref={ref}
      className="logo-mark"
      viewBox={`0 0 ${LOGO.w} ${LOGO.h}`}
      height={height}
      width={(height * LOGO.w) / LOGO.h}
      role="img"
      aria-label="tldraw pattern, designed by Murat"
      onPointerEnter={() => {
        head(1)
        watch()
      }}
      onPointerLeave={() => {
        unwatch()
        head(0)
      }}
      dangerouslySetInnerHTML={{ __html: STILL }}
    />
  )
}
