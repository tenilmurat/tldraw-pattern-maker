import { useRef } from 'react'
import raw from '../assets/logo.svg?raw'
import { BYLINE, LOGO, type LogoWord, logoWords, parseLogo, SWAP_LENGTH, swapFrame } from './motion'

const PATHS = parseLogo(raw)
const WORDS = logoWords(PATHS)
const STILL = swapFrame(SWAP_LENGTH, PATHS, WORDS, WORDS)

type Shown = 'logo' | 'byline'

/** Play one swap into `svg`, frame by frame, then call `done`. */
function playSwap(svg: SVGSVGElement, from: LogoWord[], to: LogoWord[], done: () => void) {
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min((now - start) / 1000, SWAP_LENGTH)
    svg.innerHTML = swapFrame(t, PATHS, from, to)
    if (t < SWAP_LENGTH) requestAnimationFrame(step)
    else done()
  }
  requestAnimationFrame(step)
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The header logo. Hover it and the words swap for a credit, "designed by
 * Murat"; leave and "tldraw pattern" comes back. The mark stays put; the
 * words fade out and the new ones wipe in, as they do in the welcome. A swap
 * never cuts itself short: if you leave mid-swap, the way back plays after it.
 */
export function LogoMark({ height = 24 }: { height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const shown = useRef<Shown>('logo')
  const wanted = useRef<Shown>('logo')
  const playing = useRef(false)

  const settle = () => {
    const svg = ref.current
    const to = wanted.current
    if (!svg || playing.current || to === shown.current) return
    const [from, next] = to === 'byline' ? [WORDS, BYLINE] : [BYLINE, WORDS]
    if (reducedMotion()) {
      svg.innerHTML = swapFrame(SWAP_LENGTH, PATHS, from, next)
      shown.current = to
      return
    }
    playing.current = true
    playSwap(svg, from, next, () => {
      shown.current = to
      playing.current = false
      // The pointer may have come or gone while this played.
      settle()
    })
  }

  const want = (s: Shown) => {
    wanted.current = s
    settle()
  }

  return (
    <svg
      ref={ref}
      className="logo-mark"
      viewBox={`0 0 ${LOGO.w} ${LOGO.h}`}
      height={height}
      width={(height * LOGO.w) / LOGO.h}
      role="img"
      aria-label="tldraw pattern, designed by Murat"
      onPointerEnter={() => want('byline')}
      onPointerLeave={() => want('logo')}
      dangerouslySetInnerHTML={{ __html: STILL }}
    />
  )
}
