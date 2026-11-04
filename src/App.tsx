import { useEffect, useMemo, useReducer, useState } from 'react'
import { Panel } from './components/Panel'
import { Preview } from './components/Preview'
import { createRenderer } from './engine/createRenderer'
import { createSampleImage, loadImage, type PhotoImage } from './engine/photo'
import { initialState, reducer } from './state/reducer'
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
  const renderer = useMemo(() => createRenderer(state, photo), [state, photo])

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

  // Drop or paste a picture anywhere to start a photo pattern.
  useEffect(() => {
    const usePhoto = (file: File | undefined | null) => {
      if (!file || !file.type.startsWith('image/')) return false
      dispatch({ type: 'photoSrc', src: URL.createObjectURL(file), name: file.name })
      dispatch({ type: 'mode', mode: 'photo' })
      return true
    }
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (usePhoto(e.dataTransfer?.files[0])) e.preventDefault()
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
      <Preview renderer={renderer} state={state} dispatch={dispatch} />
      <Panel state={state} dispatch={dispatch} renderer={renderer} photo={photo} />
    </main>
  )
}

export default App
