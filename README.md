# tldraw pattern

A small web app for making a repeating pattern out of shapes, made for someone who isn't a designer.

## Why I went further than shapes

The brief asks for a tool for someone with no design vocabulary. Picking shapes and arranging them still takes design judgement, the very thing that person doesn't have. But almost anyone can doodle, and almost everyone has a photo on their phone.

So Shapes is the baseline that meets the brief, and it's what you see first. Sketching and photos are where I went deeper: they let you start from something you already have. Video is the last step, because patterns get shared, and a turning pattern shows its symmetry in a way a still picture can't.

## A two-minute tour

1. **Open it.** Click to start and the logo plays with a short sound (browsers only allow sound after a click). Then a four-step tour shows the page, once. Each visit opens on a new pattern.
2. **Shapes.** Tap a few shapes, try the layouts (Grid, Bricks, Wave, Spin…), drag Size and Space. Press **Surprise me** a few times.
3. **Edit your tile.** Open the one tile the pattern repeats. Move, resize or turn a shape and the whole pattern follows.
4. **Draw.** Sketch in the square with the tldraw pens. The pattern behind it updates as you draw, mirrored or spun however you choose.
5. **Photo.** Drop in your own photo (or keep the sample), move the slice around it, and pick Kaleido, Mirror, Honeycomb or Triangles.
6. **Video.** In Photo, the MP4 button saves one full turn as a short video that loops.
7. **Paper.** Pick a printable paper (Dots, Squares, Graph, Lines, Music, Triangles, Crosses or Gingham), set the Spacing in millimetres and how fine or bold the Lines are, and choose its colours.
8. **Download.** Save a picture: one tile that repeats, square for posts, wide for screens, or A4 at true size for printing.

## Decisions I made

- **Plain words, no jargon.** Layouts are called Grid, Bricks, Diamond, Big & small, Wave, Spin and Scatter. Paper types are Dots, Squares, Lines, Music, Gingham. Nothing assumes you know the word "tessellation".
- **No seams, ever.** Wherever the pattern repeats, the edges meet. Shapes repeat on a period that always closes; scattered shapes count the tile as wrapping around its edges; Photo only uses mirror-type repeats, so the cut edges of the photo always meet themselves.
- **Colour that can't go wrong.** New colours are built in OKLCH as small families of related hues (analogous, one accent, or tonal), with a background from the same hue. Random never means clashing.
- **Few controls.** Shapes has two sliders, Size and Space. Zoom and Size are the same idea, so they move together. Everything else is a picture you can tap.
- **Surprise me as a starting point.** It changes several things at once, always inside ranges that look good, so someone who doesn't know where to start still gets something nice.
- **The tile is the lesson.** "Edit your tile" shows the one square the pattern is made from, on graph paper. Seeing it once explains what a repeating pattern is.
- **Sketching on tldraw.** Draw uses the tldraw SDK, so pens, undo and images come from tldraw. Each change is exported and repeated live behind the canvas.
- **True sizes on export.** A4 is 2480 × 3508 at 300 dpi, and the paper grids are measured in millimetres, so a printed dot grid is really 5 mm.
- **A video that loops.** The turn stops one step short of 360°, so the last frame leads straight into the first with no jump.

## Where things are in the code

- `src/engine/` is the drawing itself: plain TypeScript with no React. Every mode gives back the same small `Renderer` (a tile size, a background and a `paint` function), so the preview and every export use the same code.
- `src/state/reducer.ts` holds the whole app state in one reducer. It's saved to the browser, so you come back to what you made.
- `src/components/` is the interface: the top bar, the side panel for each mode, the tile editor and the tour.
- `src/logo/` is the logo motion. It's a pure function of time with no browser code, so the same frames can be rendered outside the page, for example as a video.

## What I'd do next

- **Tests for the engine.** Seams, palette contrast and the seeded random are pure functions and easy to test. There are none yet.
- **One drawing engine.** "Draw on the pattern" still uses my first pen engine; the square uses tldraw. I'd move both to tldraw.
- **A smaller first load.** The bundle is about 2.3 MB (680 kB gzipped), mostly tldraw. I'd load it only when you open Draw.
- **No private tldraw API.** Dropping SVGs into the drawing goes through a handler tldraw doesn't make public. I'd ask for a public way to do it.

## Running it

You need Node 20.19 or newer (22 or 24 is fine).

```bash
npm ci
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

To try the production build:

```bash
npm run build
npm run preview
```

The Draw mode uses the tldraw SDK. tldraw runs without a licence key on localhost, so both commands above work as they are. A deploy on a real domain needs a key in `VITE_TLDRAW_LICENSE_KEY`.

---

## The brief

Create a **pattern maker**: a small web app for making a repeating pattern out of shapes.

Your goal is to:

- Use a modern React stack.
- Use the shapes in `data/motifs/`. Feel free to add your own.
- The tool should be optimised for someone who is not a designer and has no vocabulary for any of this.

The engineering is the small part of this. We hope you will spend your time on the things you can only settle by looking at them — scale, spacing, colour, what happens where it repeats, and which of the many things you could expose actually deserve a control. We would rather see a few decisions made well than every feature made adequately, so take the extra time to embed some of your opinions on user experience. We will judge results based on the depth and quality of the outcome. You are expected (and encouraged!) to use AI tools to complete this task.

In the in-person phase of the interview, we will ask you about the code, and ask questions about the product decisions you have made.
