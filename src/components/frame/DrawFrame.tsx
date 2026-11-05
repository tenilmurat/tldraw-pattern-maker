import { useEffect, useRef, useState, type Dispatch } from 'react'
import { renderPlaintextFromRichText, Tldraw, useValue, type Editor, type TLShape } from 'tldraw'
import 'tldraw/tldraw.css'
import { fitTile, importStrokes, takePen, turnOf, turnTo, watchArt, type DrawArt } from '../../engine/tldraw'
import type { Action } from '../../state/reducer'
import type { PatternState } from '../../state/types'
import { isSvgText } from '../../engine/svgArt'
import { TurnDial } from '../TurnDial'
import { placeSvg, SvgArtShapeUtil } from './SvgArtShape'
import type { FrameBox } from './WorkFrame'

/** Pasted and dropped SVGs become shapes you can recolour. Kept outside the component so tldraw sees the same list every render. */
const SHAPE_UTILS = [SvgArtShapeUtil]

type Point = { x: number; y: number }
type FilesInfo = { type: 'files'; files: File[]; point?: Point }
type TextInfo = { type: 'text'; text: string; html?: string; point?: Point }
type Handler<I> = (info: I) => Promise<void> | void

/**
 * Paste or drop anything into the frame. SVGs (files, or SVG code copied from
 * Figma and the like) arrive as recolourable shapes; photos and other images
 * go to tldraw's own image handling.
 */
function acceptSvgs(editor: Editor) {
  // tldraw keeps its handlers private; borrow its own for everything that isn't an SVG.
  const handlers = (
    editor as unknown as {
      externalContentHandlers: { files?: Handler<FilesInfo> | null; text?: Handler<TextInfo> | null }
    }
  ).externalContentHandlers
  const defaultFiles = handlers.files
  const defaultText = handlers.text
  const select = (ids: ReturnType<typeof placeSvg>[]) => {
    if (!ids.length) return
    editor.setCurrentTool('select')
    editor.select(...ids)
  }
  editor.registerExternalContentHandler('svg-text', async ({ point, text }) => {
    select([placeSvg(editor, text, point)])
  })
  // tldraw only spots SVG code that starts with "<svg"; icon sites often copy it with
  // an "<?xml …?>" line first, which would otherwise arrive as a block of text.
  editor.registerExternalContentHandler('text', async (info) => {
    const text = info.text.trim()
    if (isSvgText(text)) return select([placeSvg(editor, text, info.point)])
    if (defaultText) await defaultText(info as TextInfo)
  })
  editor.registerExternalContentHandler('files', async (info) => {
    const isSvg = (f: File) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg')
    const svgs = info.files.filter(isSvg)
    const rest = info.files.filter((f) => !isSvg(f))
    const ids = []
    for (const [i, file] of svgs.entries()) {
      const text = await file.text()
      if (isSvgText(text)) ids.push(placeSvg(editor, text, info.point, i * 24))
    }
    select(ids)
    if (rest.length && defaultFiles) await defaultFiles({ ...info, files: rest } as FilesInfo)
  })
}

/** SVG code that was pasted as text before SVGs were understood becomes the SVG it describes. */
function svgTextToArt(editor: Editor) {
  const found = editor
    .getCurrentPageShapes()
    .filter((s): s is TLShape<'text'> => s.type === 'text')
    .map((s) => ({ shape: s, text: renderPlaintextFromRichText(editor, s.props.richText).trim() }))
    .filter(({ text }) => isSvgText(text))
  if (!found.length) return
  editor.run(
    () => {
      for (const { shape, text } of found) {
        // Text may not be measured yet this early; its own corner is close enough.
        const b = editor.getShapePageBounds(shape)
        const id = placeSvg(editor, text, b ? b.center : { x: shape.x + 120, y: shape.y + 120 })
        // Only take the text away once its SVG is really there.
        if (editor.getShape(id)) editor.deleteShapes([shape.id])
      }
    },
    { history: 'ignore' },
  )
}

/**
 * The drawing frame is a tldraw canvas locked to one tile: draw with
 * tldraw's pens, then select, move, resize, turn or restyle anything you drew.
 * What you draw here stays as you drew it; the pattern behind is where the
 * repeat style turns it into a pattern.
 */
export function DrawFrame({
  state,
  dispatch,
  box,
  onEditor,
  onArt,
}: {
  state: PatternState
  dispatch: Dispatch<Action>
  box: FrameBox
  onEditor: (editor: Editor | null) => void
  onArt: (art: DrawArt | null) => void
}) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [turning, setTurning] = useState(false)
  const { rotation } = state.draw
  // The turn tldraw's shapes are at. It lives in the tldraw document, so undo and redo change it too.
  const tlTurn = useValue('drawing turn', () => (editor ? turnOf(editor) : null), [editor])
  const seenTurn = useRef<number | null>(null)

  const mount = (e: Editor) => {
    fitTile(e, box.w)
    takePen(e, state.draw.pen)
    acceptSvgs(e)
    svgTextToArt(e)
    // Lines from before the canvas was tldraw come along, once.
    if (e.getCurrentPageShapeIds().size === 0 && state.draw.strokes.length) {
      importStrokes(e, state.draw.strokes)
      dispatch({ type: 'adoptStrokes' })
    }
    setEditor(e)
    onEditor(e)
    if (import.meta.env.DEV) Object.assign(window, { editor: e })
  }

  useEffect(() => () => onEditor(null), [onEditor])

  // One tile always fills the frame, whatever the window size.
  useEffect(() => {
    if (editor) fitTile(editor, box.w)
  }, [editor, box.w])

  // The dial (or the panel slider) turns the drawing: every shape turns around the middle of the tile.
  useEffect(() => {
    if (editor) turnTo(editor, rotation)
  }, [editor, rotation])

  // When tldraw's turn changes by itself (undo, redo), the dial follows it.
  useEffect(() => {
    if (tlTurn === null) return
    if (seenTurn.current !== null && seenTurn.current !== tlTurn) dispatch({ type: 'drawRotation', deg: tlTurn })
    seenTurn.current = tlTurn
    dispatch({ type: 'drawTurned', deg: tlTurn })
  }, [tlTurn, dispatch])

  // Paste works even when the canvas doesn't have focus (say, after using the panel):
  // pictures and SVG code still land in the drawing.
  useEffect(() => {
    if (!editor) return
    const onPaste = (e: ClipboardEvent) => {
      if (editor.getIsFocused()) return
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return
      const data = e.clipboardData
      if (!data) return
      const files = [...data.files].filter((f) => f.type.startsWith('image/'))
      const text = data.getData('text/plain')
      if (files.length) editor.putExternalContent({ type: 'files', files })
      else if (isSvgText(text)) editor.putExternalContent({ type: 'svg-text', text })
      else return
      e.preventDefault()
      editor.focus()
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [editor])

  // The pattern is made from a picture of the drawing, refreshed as you draw.
  useEffect(() => (editor ? watchArt(editor, onArt) : undefined), [editor, onArt])

  return (
    <>
      <div className="frame-tldraw">
        <Tldraw
          hideUi
          persistenceKey="pattern-maker-drawing"
          cameraOptions={{ isLocked: true, wheelBehavior: 'none' }}
          components={{ Background: null, Grid: null }}
          shapeUtils={SHAPE_UTILS}
          onMount={mount}
        />
      </div>
      {turning && <span className="turn-guide" aria-hidden="true" />}
      <TurnDial
        value={rotation}
        label="Turn drawing"
        onTurning={(on) => {
          // One whole turn is one step to undo.
          if (on) editor?.markHistoryStoppingPoint('turn drawing')
          setTurning(on)
        }}
        onChange={(deg) => dispatch({ type: 'drawRotation', deg })}
      />
    </>
  )
}
