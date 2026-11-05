import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Panel } from './components/Panel'
import { Preview } from './components/Preview'
import { TopBar } from './components/TopBar'
import { Welcome } from './logo/Welcome'
import { createRenderer } from './engine/createRenderer'
import { createSampleImage, loadImage, type PhotoImage } from './engine/photo'
import { initialState, reducer } from './state/reducer'
import type { DrawArt } from './engine/tldraw'
import type { PatternState } from './state/types'

const STORAGE_KEY = 'pattern-maker:v2'

/** Come back to the pattern you left. The photo itself isn't stored, only how it was framed. */
function loadSaved(fallback: PatternState): PatternState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw) as PatternState
    return {
      ...fallback,
      ...saved,
      shapes: { ...fallback.shapes, ...saved.shapes, selected: null },
      draw: { ...fallback.draw, ...saved.draw, past: [], future: [] },
      // Saved before Draw and Paper had colours of their own: they start on white.
      modePalettes: { ...fallback.modePalettes, ...saved.modePalettes },
      photo: { ...saved.photo, src: null, name: 'Sample' },
    }
  } catch {
    return fallback
  }
}

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState, loadSaved)
  const sample = useMemo(() => createSampleImage(), [])
  const [userPhoto, setUserPhoto] = useState<{ src: string; image: PhotoImage } | null>(null)

  useEffect(() => {
    const src = state.photo.src
    if (!src) return
    let alive = true
    loadImage(src).then(
      (image) => alive && setUserPhoto({ src, image }),
      () => alive && dispatch({ type: 'photoSrc', src: null, name: 'Sample' }),
    )
    return () => {
      alive = false
    }
  }, [state.photo.src])

  const photo = userPhoto && userPhoto.src === state.photo.src ? userPhoto.image : sample
  // A picture of the drawing in the tldraw frame. Not saved: tldraw keeps the drawing itself.
  const [art, setArt] = useState<DrawArt | null>(null)
  const renderer = useMemo(() => createRenderer(state, photo, art), [state, photo, art])

  // Handy when checking seams from the console during development.
  if (import.meta.env.DEV) Object.assign(window, { __pattern: { renderer, state } })

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, draw: { ...state.draw, past: [], future: [] } }))
      } catch {
        // Storage full or blocked: the app works the same, it just won't remember.
      }
    }, 300)
    return () => clearTimeout(id)
  }, [state])

  // Drop or paste a picture anywhere to start a photo pattern. In Draw, pictures
  // go into the drawing instead (tldraw takes them), so leave them alone there.
  const modeRef = useRef(state.mode)
  useEffect(() => {
    modeRef.current = state.mode
  }, [state.mode])
  useEffect(() => {
    const usePhoto = (file: File | undefined | null) => {
      if (modeRef.current === 'draw') return false
      if (!file || !file.type.startsWith('image/')) return false
      dispatch({ type: 'photoSrc', src: URL.createObjectURL(file), name: file.name })
      dispatch({ type: 'mode', mode: 'photo' })
      return true
    }
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      // A file dropped beside the drawing frame shouldn't make the browser open it.
      if (modeRef.current === 'draw') e.preventDefault()
      else if (usePhoto(e.dataTransfer?.files[0])) e.preventDefault()
    }
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))
      usePhoto(item?.getAsFile())
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  return (
    <main className="app">
      <Preview renderer={renderer} state={state} dispatch={dispatch} art={art} onArt={setArt} />
      <TopBar state={state} dispatch={dispatch} renderer={renderer} />
      <Panel state={state} dispatch={dispatch} photo={photo} art={art} />
      <Welcome />
    </main>
  )
}

export default App
