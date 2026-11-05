import { useEffect, useRef, useState } from 'react'
import { Icon } from './controls'

/** Degrees per pixel of sideways drag: about 120 px takes you from 0° to 180°. */
const SPEED = 1.5
/** How far you have to push past 0° before it lets go (about 19 px of drag). */
const HOLD = 28
const RING_R = 12.5
const RING_C = 2 * Math.PI * RING_R

const clamp = (v: number) => Math.max(-180, Math.min(180, v))

/**
 * Turning control: hold the dial and drag right to turn right, left to turn
 * left. The ring fills from 12 o'clock by the angle. 0° is a stop: passing
 * through it lands on exactly 0°, and it holds there until you push on, with a
 * small thunk. ±180° is the end of the travel. Reset (or a double-tap) eases back.
 */
export function TurnDial({
  value,
  onChange,
  onTurning,
  label,
}: {
  value: number
  onChange: (deg: number) => void
  onTurning?: (turning: boolean) => void
  label: string
}) {
  const [turning, setTurning] = useState(false)
  const [bump, setBump] = useState(0)
  const drag = useRef<{ x: number; v: number; hold: number } | null>(null)
  const lastTap = useRef(0)
  const tween = useRef(0)

  useEffect(() => () => cancelAnimationFrame(tween.current), [])

  const thunk = () => {
    setBump((b) => b + 1)
    navigator.vibrate?.(8)
  }

  const reset = () => {
    cancelAnimationFrame(tween.current)
    const from = value
    if (from === 0) return
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 320)
      const eased = 1 - (1 - t) ** 3
      onChange(Math.round(from * (1 - eased)))
      if (t < 1) tween.current = requestAnimationFrame(step)
      else thunk()
    }
    tween.current = requestAnimationFrame(step)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    cancelAnimationFrame(tween.current)
    if (e.timeStamp - lastTap.current < 350) {
      lastTap.current = 0
      reset()
      return
    }
    lastTap.current = e.timeStamp
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, v: value, hold: 0 }
    setTurning(true)
    onTurning?.(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const delta = (e.clientX - d.x) * SPEED
    d.x = e.clientX
    if (e.shiftKey) {
      // Shift: the same drag, in 15° steps.
      d.v = clamp(d.v + delta)
      onChange(Math.round(d.v / 15) * 15)
      return
    }
    let v = d.v
    if (v === 0) {
      // Sitting in the 0° stop: collect the push until it's enough to let go.
      d.hold += delta
      if (Math.abs(d.hold) > HOLD) {
        v = d.hold - Math.sign(d.hold) * HOLD
        d.hold = 0
      }
    } else {
      const next = v + delta
      if (Math.sign(next) !== Math.sign(v)) {
        // Crossing straight: stop on it.
        v = 0
        d.hold = 0
        thunk()
      } else v = next
    }
    const limited = clamp(v)
    if (limited !== v && Math.abs(d.v) < 180) thunk()
    d.v = limited
    onChange(Math.round(limited))
  }

  const onPointerUp = () => {
    drag.current = null
    setTurning(false)
    onTurning?.(false)
  }

  return (
    <div className={`turn-control ${turning ? 'is-turning' : ''}`}>
      <button
        type="button"
        className="turn-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onChange(clamp(value + (e.shiftKey ? 15 : 1)))
          if (e.key === 'ArrowLeft') onChange(clamp(value - (e.shiftKey ? 15 : 1)))
          if (e.key === '0') reset()
        }}
        aria-label={`${label}, now ${value} degrees. Drag left or right to turn.`}
        title="Hold and drag left or right"
      >
        <svg key={bump} className={bump ? 'is-thunk' : undefined} viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
          <circle cx="20" cy="20" r={RING_R} className="turn-track" />
          <circle
            cx="20"
            cy="20"
            r={RING_R}
            className="turn-fill"
            strokeDasharray={`${RING_C} ${RING_C}`}
            strokeDashoffset={RING_C * (1 - Math.abs(value) / 360)}
            transform={value < 0 ? 'rotate(-90 20 20) scale(1 -1) translate(0 -40)' : 'rotate(-90 20 20)'}
          />
        </svg>
      </button>
      <output key={bump} className={`turn-readout ${bump ? 'is-thunk' : ''}`} aria-live="polite">
        {value}°
      </output>
      {value !== 0 && !turning && (
        <button type="button" className="turn-reset" onClick={reset} title="Back to 0°">
          <Icon name="undo" size={14} />
          Reset
        </button>
      )}
    </div>
  )
}
