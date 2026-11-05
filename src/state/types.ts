import type { Palette } from '../engine/color'
import type { PenId, StrokePoint } from '../engine/pens'
import type { SymmetryId } from '../engine/symmetry'

export type Mode = 'shapes' | 'draw' | 'photo' | 'paper'

export type ShapeLayout = 'grid' | 'bricks' | 'diamond' | 'bigsmall' | 'wave' | 'spin' | 'scatter' | 'custom'

/** One shape placed by hand in the working frame. Position and size are fractions of the tile. */
export interface Stamp {
  id: number
  motif: string
  x: number
  y: number
  /** Width as a fraction of the tile width. */
  size: number
  rot: number
  /** Index into palette.inks. */
  ink: number
}

/** A hand-made arrangement: the tile's height/width ratio and the shapes in it. */
export interface Arrangement {
  aspect: number
  stamps: Stamp[]
}

export type DrawSurface = 'frame' | 'pattern'

export type PaperKind =
  | 'dots'
  | 'grid'
  | 'graph'
  | 'lines'
  | 'music'
  | 'iso'
  | 'crosses'
  | 'gingham'

/** A freehand line, stored in tile units so it survives Size changes. Plain data, safe to save. */
export interface Stroke {
  id: number
  pen: PenId
  /** [x, y, width factor] in tile units. */
  points: StrokePoint[]
  /** Diameter in tile units. */
  size: number
  colour: string
  opacity: number
}

export interface PhotoSelection {
  /** Centre of the selection, as a fraction of the image width / height. */
  cx: number
  cy: number
  /** Width of the selection, as a fraction of the image's shorter side. */
  size: number
  /** Turn in degrees. */
  angle: number
}

export interface PatternState {
  mode: Mode
  /** 0..1, mapped per mode to a pixel size ("smaller ↔ bigger"). */
  size: number
  /** Colours for Shapes. */
  palette: Palette
  /**
   * Draw and Paper keep colours of their own and start on white, so a
   * Surprise me in Shapes never repaints them. Only changes made there do.
   */
  modePalettes: { draw: Palette; paper: Palette }
  seed: number
  shapes: {
    /** Chosen shapes, in the order they repeat. */
    active: string[]
    layout: ShapeLayout
    /** 0..1, "tighter ↔ roomier". */
    space: number
    /** The user's own arrangement, kept even while a preset layout is chosen. */
    custom: Arrangement | null
    /** Selected stamp in the working frame. */
    selected: number | null
    /** Shape that a tap in the frame adds. */
    pick: string
  }
  draw: {
    /** Draw one tile in a frame (default) or straight onto the repeat. */
    surface: DrawSurface
    /** Turn of the whole drawing, in degrees. */
    rotation: number
    /** How much of that turn has been applied to the shapes in the tldraw frame. */
    turned: number
    symmetry: SymmetryId
    strokes: Stroke[]
    /** Earlier drawings, for undo (clearing is one step too). */
    past: Stroke[][]
    /** Undone drawings, for redo. */
    future: Stroke[][]
    pen: PenId
    /** Per pen, in CSS px. */
    sizes: Record<PenId, number>
    /** Per pen, 0.1..1. */
    opacities: Record<PenId, number>
    /** Shared ink for every pen, the highlighter too. */
    ink: string
  }
  photo: {
    symmetry: SymmetryId
    selection: PhotoSelection
    /** Object URL of the user's image, or null for the built-in sample. */
    src: string | null
    name: string
  }
  paper: {
    kind: PaperKind
    /** Distance between lines/dots in millimetres at print size. */
    spacingMm: number
    /** 0..1, "fine ↔ bold". */
    weight: number
  }
}
