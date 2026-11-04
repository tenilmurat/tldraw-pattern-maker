import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react'
import { createPhotoRenderer, selectionRect, type PhotoImage } from '../engine/photo'
import { PHOTO_SYMMETRIES, SYMMETRIES } from '../engine/symmetry'
import type { Action } from '../state/reducer'
import type { PatternState } from '../state/types'
import { Icons, OptionCard, Section, Slider } from './controls'
import { MiniPattern } from './MiniPattern'

/**
 * The photo with the slice that gets mirrored drawn on top. Drag the slice
 * to move it, drag its corner to resize. The shape of the slice matches the
 * repeat style (a square, a triangle…), so what you frame is what repeats.
 */
function SliceEditor({
  image,
  state,
  dispatch,
}: {
  image: PhotoImage
  state: PatternState
  dispatch: Dispatch<Action>
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(300)
  const drag = useRef<{ kind: 'move' | 'resize'; dx: number; dy: number } | null>(null)

  const scale = width / image.width
  const height = image.height * scale
  const { symmetry, selection } = state.photo
  const g = SYMMETRIES[symmetry]
  const rect = selectionRect(image, selection, symmetry)

  useEffect(() => {
    const el = wrapRef.current!
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    ctx.drawImage(image.source, 0, 0, image.width, image.height)
  }, [image, width, height, scale])

  // Slice outline in display pixels, in the slice's own (turned) frame.
  const w = rect.w * scale
  const h = rect.h * scale
  const poly = g.domain
    .map(([x, y]) => `${(x / g.domainW - 0.5) * w},${(y / g.domainH - 0.5) * h}`)
    .join(' ')
  const transform = `translate(${rect.cx * scale} ${rect.cy * scale}) rotate(${selection.angle})`

  const local = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect()
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale] as const
  }

  const onPointerDown = (kind: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const [x, y] = local(e)
    drag.current = { kind, dx: x - rect.cx, dy: y - rect.cy }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const [x, y] = local(e)
    if (d.kind === 'move') {
      dispatch({
        type: 'selection',
        selection: { cx: (x - d.dx) / image.width, cy: (y - d.dy) / image.height },
      })
    } else {
      // Distance along the slice's own x axis sets its width.
      const a = (selection.angle * Math.PI) / 180
      const lx = (x - rect.cx) * Math.cos(a) + (y - rect.cy) * Math.sin(a)
      dispatch({
        type: 'selection',
        selection: { size: (Math.abs(lx) * 2) / Math.min(image.width, image.height) },
      })
    }
  }

  return (
    <div className="slice-editor" ref={wrapRef} style={{ height }}>
      <canvas ref={canvasRef} style={{ width, height }} />
      <svg
        width={width}
        height={height}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <defs>
          <mask id="slice-mask">
            <rect width={width} height={height} fill="white" />
            <polygon points={poly} transform={transform} fill="black" />
          </mask>
        </defs>
        <rect width={width} height={height} className="slice-dim" mask="url(#slice-mask)" />
        <g transform={transform}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} className="slice-box" />
          <polygon points={poly} className="slice-shape" onPointerDown={onPointerDown('move')} />
          <circle cx={w / 2} cy={h / 2} r={9} className="slice-handle" onPointerDown={onPointerDown('resize')} />
        </g>
      </svg>
    </div>
  )
}

export function PhotoPanel({
  state,
  dispatch,
  image,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  image: PhotoImage
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { symmetry, selection, src, name } = state.photo

  const options = useMemo(
    () =>
      PHOTO_SYMMETRIES.map((id) => ({
        ...SYMMETRIES[id],
        renderer: createPhotoRenderer({ image, selection, symmetry: id, size: 0, unit: 90 }),
      })),
    [image, selection],
  )

  return (
    <>
      <Section
        title="Photo"
        aside={
          <span className="aside">
            {src ? (
              <button type="button" className="link" onClick={() => dispatch({ type: 'photoSrc', src: null, name: 'Sample' })}>
                Use sample
              </button>
            ) : (
              'Sample'
            )}
          </span>
        }
      >
        <SliceEditor image={image} state={state} dispatch={dispatch} />
        <p className="note">Drag the shape to choose which part repeats. Drag its dot to resize.</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) dispatch({ type: 'photoSrc', src: URL.createObjectURL(file), name: file.name })
            e.target.value = ''
          }}
        />
        <button type="button" className="button wide" onClick={() => fileRef.current?.click()}>
          {Icons.upload}
          {src ? `Change photo (${name})` : 'Use your own photo'}
        </button>
        <Slider
          label="Turn"
          low="Left"
          high="Right"
          min={-180}
          max={180}
          step={1}
          value={selection.angle}
          readout={`${Math.round(selection.angle)}°`}
          onChange={(angle) => dispatch({ type: 'selection', selection: { angle } })}
        />
      </Section>

      <Section title="Repeat style">
        <div className="option-grid">
          {options.map((o) => (
            <OptionCard
              key={o.id}
              label={o.name}
              hint={o.hint}
              selected={symmetry === o.id}
              onSelect={() => dispatch({ type: 'photoSymmetry', symmetry: o.id })}
            >
              <MiniPattern renderer={o.renderer} zoom={1} />
            </OptionCard>
          ))}
        </div>
        <Slider
          label="Size"
          low="Smaller"
          high="Bigger"
          value={state.size}
          onChange={(value) => dispatch({ type: 'size', value })}
        />
      </Section>
    </>
  )
}
