import { BufferTarget, CanvasSource, canEncodeVideo, Mp4OutputFormat, Output, QUALITY_HIGH } from 'mediabunny'
import { download, paintCentred } from './export'
import type { Renderer } from './renderer'

/** How fast the slice turns when it plays: one full turn in 8 seconds. */
export const TURN_SPEED = 45

/** Keep an angle within -180..180, so a full turn wraps without a jump. */
export const wrapAngle = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180

/** How many frames one full turn takes at `fps`. */
export const turnFrameCount = (fps: number) => Math.round((360 / TURN_SPEED) * fps)

/**
 * The angle of every frame in one full turn. The last frame stops one step
 * short of 360°, so the video's first frame follows it seamlessly when it loops.
 */
export const turnAngles = (from: number, frames: number) =>
  Array.from({ length: frames }, (_, i) => wrapAngle(from + (360 * i) / frames))

/**
 * Play the turn: the angle keeps rising at TURN_SPEED and wraps from 180 to
 * -180, which is the same position, so the loop never jumps. Returns stop.
 */
export function loopTurn(from: number, onAngle: (deg: number) => void): () => void {
  let angle = from
  let last = performance.now()
  let raf = requestAnimationFrame(function step(now) {
    // A frame's timestamp can be a touch earlier than when the loop started; never step backwards.
    angle = wrapAngle(angle + (Math.max(0, now - last) / 1000) * TURN_SPEED)
    last = Math.max(last, now)
    onAngle(Math.round(angle * 10) / 10)
    raf = requestAnimationFrame(step)
  })
  return () => cancelAnimationFrame(raf)
}

/**
 * One full turn as a 1080 × 1080 MP4 that loops seamlessly: every frame is
 * painted and encoded in turn, so it's sharp and takes as long as the
 * computer needs, not 8 seconds of screen recording.
 */
export async function exportTurnMp4(
  rendererAt: (deg: number) => Renderer,
  from: number,
  name: string,
  onProgress: (done: number) => void,
) {
  const size = 1080
  const k = 2
  const fps = 30
  const angles = turnAngles(from, turnFrameCount(fps))
  const frames = angles.length
  if (!(await canEncodeVideo('avc', { width: size, height: size }))) {
    throw new Error('This browser can’t make MP4 videos. Try Chrome, Edge or Safari.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
  const source = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_HIGH })
  output.addVideoTrack(source, { frameRate: fps })
  await output.start()

  for (let i = 0; i < frames; i++) {
    paintCentred(ctx, rendererAt(angles[i]), size, size, k)
    await source.add(i / fps, 1 / fps)
    onProgress((i + 1) / frames)
  }
  await output.finalize()
  download(new Blob([output.target.buffer!], { type: 'video/mp4' }), `${name}-turn.mp4`)
}
