import { MARK_AT } from './motion'

/** The welcome sound. */
export const WELCOME_SOUND = '/sounds/welcome.mp3'
/** Where the sound peaks, in seconds into the file. */
const SOUND_PEAK = 0.44
/** When the file starts, in seconds of the motion, so its peak lands on the mark's arrival. */
export const SOUND_AT = MARK_AT - SOUND_PEAK

export interface WelcomeSound {
  /** Fade away quickly if the welcome is skipped while the sound is still playing. */
  fadeOut(): void
}

/**
 * Play the welcome sound in step with the motion that began at `motionStart`
 * (a performance.now() time): scheduled on the Web Audio clock, so its peak
 * lands on the mark's arrival to the millisecond. Browsers only allow sound
 * once a visitor has interacted with the site; when it isn't allowed, or
 * isn't ready before its moment, the welcome plays without it.
 */
export function startWelcomeSound(motionStart: number): WelcomeSound | null {
  const AC = typeof window !== 'undefined' ? window.AudioContext : undefined
  if (!AC) return null
  const ctx = new AC({ latencyHint: 'interactive' })
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  let source: AudioBufferSourceNode | null = null
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    void ctx.close().catch(() => {})
  }

  void (async () => {
    try {
      const [buffer] = await Promise.all([
        fetch(WELCOME_SOUND).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)),
        ctx.state === 'running' ? Promise.resolve() : Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 150))]),
      ])
      if (closed || ctx.state !== 'running') return close()
      // Where the motion is now, on the audio clock.
      const elapsed = (performance.now() - motionStart) / 1000
      const wait = SOUND_AT - elapsed
      // Too late to hit the beat: stay quiet rather than land out of step.
      if (wait < -0.05) return close()
      source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(gain)
      source.start(ctx.currentTime + Math.max(0, wait), Math.max(0, -wait))
      source.onended = close
    } catch {
      close()
    }
  })()

  return {
    fadeOut() {
      if (closed) return
      if (!source) return close()
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + 0.35)
      window.setTimeout(close, 450)
    },
  }
}
