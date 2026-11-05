export interface TourStep {
  /** The part of the page this step is about. Steps whose part isn't on the page are left out. */
  target: string
  title: string
  body: string
}

/** The first-visit tour, in order: the modes, the panel, the tile, then Download. */
export const TOUR_STEPS: TourStep[] = [
  {
    target: '.modes',
    title: 'Choose what to start from',
    body: 'Make a pattern from shapes, your own drawing, a photo, or paper like dots and grids. Switch any time; each one keeps what you made.',
  },
  {
    target: '.panel',
    title: 'Change your pattern here',
    body: 'Pick shapes, a layout, the size and the colours. Not sure where to start? Surprise me tries something new.',
  },
  {
    target: '.show-frame',
    title: 'Edit your tile',
    body: 'A pattern is one tile, repeated. Open your tile to move, resize or turn shapes by hand, and the whole pattern follows.',
  },
  {
    target: '.actions .button',
    title: 'Save it when you love it',
    body: 'Download your pattern as a picture: square for posts, wide for screens, or A4 ready to print.',
  },
]
