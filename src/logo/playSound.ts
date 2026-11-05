import { MARK_AT } from './motion'

/** The welcome sound. */
export const WELCOME_SOUND = '/sounds/welcome.mp3'
/** Where the sound peaks, in seconds into the file. */
const SOUND_PEAK = 0.44
/** When the file starts, in seconds of the motion, so its peak lands on the mark's arrival. */
export const SOUND_AT = MARK_AT - SOUND_PEAK

export interface WelcomeAudio {
  /** Call inside a click or key press: that's what browsers need before they allow sound. */
  unlock(): void
  /** Play in step with the motion that began at `motionStart` (a performance.now() time). */
  play(motionStart: number): void
  /** Fade away quickly, if the welcome is skipped while the sound is still playing. */
  fadeOut(): void
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The welcome sound, loaded and decoded straight away, then scheduled on the
 * Web Audio clock so its peak lands on the mark's arrival to the millisecond.
 * Browsers only allow sound once a visitor has clicked or pressed a key on
 * the page, so the welcome waits for one click and calls `unlock()` inside it.
 */
export function createWelcomeAudio(): WelcomeAudio | null {
  const AC = typeof window !== 'undefined' ? window.AudioContext : undefined
  if (!AC) return null
  const ctx = new AC({ latencyHint: 'interactive' })
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  const buffer: Promise<AudioBuffer | null> = fetch(WELCOME_SOUND)
    .then((r) => r.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    .catch(() => null)
  let source: AudioBufferSourceNode | null = null
  let closed = false
  // Read fresh each time: the browser changes it.
  const running = () => ctx.state === 'running'
  const close = () => {
    if (closed) return
    closed = true
    void ctx.close().catch(() => {})
  }

  return {
    unlock() {
      void ctx.resume().catch(() => {})
    },
    play(motionStart) {
      void (async () => {
        const buf = await buffer
        if (!buf || closed) return close()
        if (!running()) await Promise.race([ctx.resume().catch(() => {}), wait(300)])
        if (closed || !running()) return close()
        // Where the motion is now, on the audio clock.
        const ahead = SOUND_AT - (performance.now() - motionStart) / 1000
        // Too late to hit the beat: stay quiet rather than land out of step.
        if (ahead < -0.05) return close()
        source = ctx.createBufferSource()
        source.buffer = buf
        source.connect(gain)
        source.start(ctx.currentTime + Math.max(0, ahead), Math.max(0, -ahead))
        source.onended = close
      })()
    },
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
