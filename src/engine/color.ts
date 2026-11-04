import { between, pick, type Rand } from './random'

/**
 * A palette is one paper colour plus a few inks that are meant to sit together.
 * People never pick hex values here: they pick a named set or press Shuffle,
 * and Shuffle only ever builds sets from related hues (see harmoniousPalette).
 */
export interface Palette {
  name: string
  paper: string
  inks: string[]
}

export const PALETTES: Palette[] = [
  { name: 'Garden', paper: '#eef3e8', inks: ['#2f6b4f', '#8bb174', '#e3a64a'] },
  { name: 'Sunset', paper: '#fff4e8', inks: ['#e8743b', '#f2b134', '#c9577a'] },
  { name: 'Ocean', paper: '#e9f2f6', inks: ['#1f5f8b', '#4fa3c7', '#9dd3d9'] },
  { name: 'Candy', paper: '#fff0f3', inks: ['#ff6f91', '#ffc75f', '#845ec2'] },
  { name: 'Festive', paper: '#fbf6ee', inks: ['#b3262e', '#2f6b3f', '#d4a537'] },
  { name: 'Ink', paper: '#f6f5f2', inks: ['#1c1c1c', '#5c5c5c', '#a3a3a3'] },
  { name: 'Night', paper: '#1d2238', inks: ['#f2c14e', '#f78154', '#b4c5e4'] },
  { name: 'Clay', paper: '#f3e6da', inks: ['#a4573b', '#3e5c58', '#d9a679'] },
]

// --- OKLCH → sRGB -----------------------------------------------------------

function oklchToLinear(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005)
const encode = (v: number) => {
  const c = Math.min(1, Math.max(0, v))
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
}

/** OKLCH to hex, pulling chroma in until the colour fits sRGB (keeps hue and lightness). */
export function oklch(L: number, C: number, h: number): string {
  let c = C
  let rgb = oklchToLinear(L, c, h)
  while (!inGamut(rgb) && c > 0) {
    c = Math.max(0, c - 0.005)
    rgb = oklchToLinear(L, c, h)
  }
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round(encode(v) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}

/**
 * Random but always-harmonious palette: one base hue, inks from a small set of
 * proven relationships, and a paper colour derived from the same hue.
 */
export function harmoniousPalette(rand: Rand): Palette {
  const h = rand() * 360
  const dark = rand() < 0.18
  const scheme = pick(rand, ['analogous', 'accent', 'tonal'] as const)
  const lift = dark ? 0.2 : 0
  const chroma = between(rand, 0.11, 0.16)

  const inks =
    scheme === 'analogous'
      ? [
          oklch(0.5 + lift, chroma, h),
          oklch(0.68 + lift * 0.6, chroma, h + 35),
          oklch(0.78 + lift * 0.3, chroma * 0.8, h - 30),
        ]
      : scheme === 'accent'
        ? [
            oklch(0.46 + lift, chroma * 0.9, h),
            oklch(0.72 + lift * 0.4, chroma, h + 180),
            oklch(0.64 + lift * 0.5, chroma * 0.7, h + 20),
          ]
        : [
            oklch(0.4 + lift, chroma * 0.8, h),
            oklch(0.6 + lift * 0.6, chroma, h + 8),
            oklch(0.8 + lift * 0.2, chroma * 0.6, h + 16),
          ]

  const paper = dark ? oklch(0.24, 0.035, h + 10) : oklch(0.965, 0.022, h + 10)
  return { name: 'Shuffled', paper, inks }
}
