import { useEffect, useRef, useState } from 'react'
import raw from '../assets/logo.svg?raw'
import { parseLogo, SETTLED, STAGE, welcomeFrame } from './motion'
import { startWelcomeSound, type WelcomeSound } from './playSound'

const PATHS = parseLogo(raw)
/** How long the settled logo stays before the page shows through. */
const HOLD = 0.45

/** Play the motion into `svg` from `start` (a performance.now() time); calls `done` once the logo has settled. Returns stop. */
function play(svg: SVGSVGElement | null, start: number, done: () => void): () => void {
  let raf = 0
  const step = (now: number) => {
    const t = (now - start) / 1000
    if (svg) svg.innerHTML = welcomeFrame(t, PATHS)
    if (t < SETTLED + HOLD) raf = requestAnimationFrame(step)
    else done()
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The opening screen: the logo's welcome motion, then it fades away to the
 * app, with its sound. A click or any key skips it; with reduced motion it doesn't play.
 */
export function Welcome() {
  const [phase, setPhase] = useState<'play' | 'leaving' | 'gone'>(() => (reducedMotion() ? 'gone' : 'play'))
  const svgRef = useRef<SVGSVGElement>(null)
  const soundRef = useRef<WelcomeSound | null>(null)
  // One start time for the motion and the sound, so the sound's peak lands on the mark's arrival.
  const startRef = useRef(0)

  // The welcome sound, in step with the motion (when the browser allows sound).
  useEffect(() => {
    startRef.current = performance.now()
    if (reducedMotion()) return
    const sound = startWelcomeSound(startRef.current)
    soundRef.current = sound
    return () => sound?.fadeOut()
  }, [])

  useEffect(() => {
    if (phase !== 'play') return
    const skip = () => setPhase('leaving')
    const stop = play(svgRef.current, startRef.current || performance.now(), skip)
    window.addEventListener('keydown', skip)
    // If frames stall (a hidden tab), the app still appears.
    const safety = window.setTimeout(skip, (SETTLED + HOLD + 2) * 1000)
    return () => {
      stop()
      window.removeEventListener('keydown', skip)
      clearTimeout(safety)
    }
  }, [phase])

  // Leaving: show the settled logo while the whole screen fades.
  useEffect(() => {
    if (phase !== 'leaving') return
    soundRef.current?.fadeOut()
    if (svgRef.current) svgRef.current.innerHTML = welcomeFrame(SETTLED, PATHS)
    const id = window.setTimeout(() => setPhase('gone'), 600)
    return () => clearTimeout(id)
  }, [phase])

  if (phase === 'gone') return null
  const { x, y, w, h } = STAGE
  return (
    <div className={`welcome ${phase === 'leaving' ? 'is-leaving' : ''}`} onPointerDown={() => setPhase('leaving')} aria-hidden="true">
      <svg ref={svgRef} className="welcome-stage" viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" />
    </div>
  )
}
