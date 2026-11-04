/** Small seeded random number generator (mulberry32), so a "surprise" can be reproduced. */
export type Rand = () => number

export function createRand(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31)

export const pick = <T>(rand: Rand, items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)]

export const between = (rand: Rand, min: number, max: number) =>
  min + rand() * (max - min)

/** Fisher–Yates on a copy. */
export function shuffled<T>(rand: Rand, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Stable hash of two integers to [0, 1). Used for per-cell jitter that repeats with the tile. */
export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

let lastId = Date.now()
/** Unique, increasing ids for strokes and stamps. */
export const newId = () => ++lastId
