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
7. **Paper.** Pick a paper style (Dots, Squares, Graph, Lines, Music, Triangles, Crosses or Gingham), set the Spacing in millimetres and how fine or bold the Lines are, and choose its colours.
8. **Download.** Save a picture for screens and posts: one tile that repeats, square, portrait, Full HD or 4K. There's also one A4 size if you'd like to print it.

## Decisions I made

- **Plain words, no jargon.** Layouts are called Grid, Bricks, Diamond, Big & small, Wave, Spin and Scatter. Paper types are Dots, Squares, Lines, Music, Gingham.
- **No seams, ever.** Wherever the pattern repeats, the edges meet. Shapes repeat on a period that always closes; scattered shapes count the tile as wrapping around its edges; Photo only uses mirror-type repeats, so the cut edges of the photo always meet themselves.
- **Colour that can't go wrong.** New colours are built in OKLCH as small families of related hues (analogous, one accent, or tonal), with a background from the same hue. Random never means clashing.
- **Few controls.** Shapes has two sliders, Size and Space. Zoom and Size are the same idea, so they move together. Everything else is a picture you can tap.
- **Surprise me as a starting point.** It changes several things at once, always inside ranges that look good, so someone who doesn't know where to start still gets something nice.
- **The tile is the lesson.** "Edit your tile" shows the one square the pattern is made from, on graph paper. Seeing it once explains what a repeating pattern is.
- **Sketching on tldraw.** Draw uses the tldraw SDK, so pens, undo and images come from tldraw. Each change is exported and repeated live behind the canvas.
- **Sizes made for screens.** Downloads come in the sizes people actually use: one tile that repeats seamlessly, 1080 × 1080, 2048 × 2048, 1080 × 1350 portrait, Full HD and 4K. There's one A4 option for printing, and at that size the paper grids keep their real millimetres.
- **A video that loops.** The turn stops one step short of 360°, so the last frame leads straight into the first with no jump.

## The pens

Draw has a tray of eight pens: Pencil, Pen, Fineliner, Marker, Highlighter, Brush, Fountain Pen and Eraser. Each one draws the way the real thing would, so nobody has to know what "stroke width" or "opacity" means. You just pick the pen that looks right.

- **Each pen is a preset of tldraw's own tools.** Picking a pen sets tldraw's tool, size, line style and opacity in one go. The Marker is tldraw's draw tool, large and solid; the Pencil is small, hand-drawn and a little see-through; the Highlighter is tldraw's highlight tool. So undo, selecting, moving and erasing all come from tldraw.
- **One colour row for every pen.** Choosing a colour changes the ink for all the pens, the way you'd pick up a new colour, not a new pen.
- **Size and opacity are tucked away.** They sit behind one button in the tray. Most people never need them, because each pen already has a sensible size.
- **What you draw becomes the pattern straight away.** Every change in the square is turned into a picture and repeated live behind the frame: quick while you draw, then sharp once you stop, so a download is crisp even at 4K.
- **Turn the whole drawing.** The dial at the top right turns everything around the middle of the tile, and one undo turns it back.
- **The pen art is my own.** The tray's pens are drawn in SVG to look like real pens, with graphite barrels and a band in the current ink colour.

"Draw on the pattern", which draws straight onto the repeat, still uses the first pen engine I wrote myself (lines thin when you draw fast, ends taper, the Fountain Pen has a fixed 45° nib and the Pencil a grain). Moving it to tldraw too is in "What I'd do next".

## Where things are in the code

- `src/engine/` is the drawing itself: plain TypeScript with no React. Every mode gives back the same small `Renderer` (a tile size, a background and a `paint` function), so the preview and every export use the same code.
- `src/state/reducer.ts` holds the whole app state in one reducer. It's saved to the browser, so you come back to what you made.
- `src/components/` is the interface: the top bar, the side panel for each mode, the tile editor and the tour.
- `src/logo/` is the logo motion. It's a pure function of time with no browser code, so the same frames can be rendered outside the page, for example as a video.
- `src/test/` checks the decisions above, one file per idea.

## How the decisions are tested

Each decision above has tests in `src/test/`, so a change that breaks one fails loudly:

| File | What it checks |
|---|---|
| `seams.test.ts` | Every Shapes layout repeats exactly after one tile. Every repeat style in Draw and Photo is a real wallpaper pattern. Every edge of a Photo slice is a mirror, so the cuts meet, and Spin is shown to fail that, which is why Photo leaves it out. |
| `colour.test.ts` | Across 2,000 random palettes, the strongest ink always has at least 4.5:1 contrast with the paper (the WCAG bar for text), the paper shares the ink's hue, and the same seed gives the same palette. Every named palette has an ink that stands out. |
| `controls.test.ts` | No jargon in any name or hint people see. Zoom and Size are the same control. Surprise me always stays in good ranges in every mode. Every visit opens on a new pattern and keeps your Draw, Photo and Paper settings. Opening your tile keeps the same shapes. |
| `output.test.ts` | Every download is a size people use, and the one A4 option keeps paper grids at their real millimetres. The video is 240 frames, and its last frame leads into the first with no jump. |
| `firstVisit.test.ts` | Draw opens on a clean page, the tour runs in its order, and hovering the logo shows "designed by Murat". |
| `logoMark.test.tsx` | The hover follows the mouse: "designed by Murat" while it's over the logo, the plain logo once it leaves, turning straight back if it leaves midway, and still landing right if the mouse flicks in and out or the browser stops sending frames. |
| `welcome.test.tsx` | The opening screen always waits on "Click anywhere to start" with "by Murat", and a click or a key starts the logo. |

Pixels aren't tested: the tests run without a real canvas and check where things go, not how they look.

## What I'd do next

- **Tests in a real browser.** The tests above cover the logic. I'd add a few browser tests too, for the tour, the tldraw canvas and the downloads.
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

## Checking it

The tests need Node 22.12 or newer.

```bash
npm test
```

Runs the tests once (`npm run test:watch` keeps them running while you edit).

```bash
npm run check
```

Runs everything a change should pass: lint, tests, typecheck and the production build.

```bash
npm run check:clone
```

Clones the repo from GitHub into an empty folder, the way a reviewer would, runs `npm ci` and `npm run check` on that copy, then deletes it. It only sees what has been pushed.

To see the first visit as a new person would, open the app in a private window: the welcome, the tour, a fresh pattern and an empty Draw page all show again.

---

## The brief

Create a **pattern maker**: a small web app for making a repeating pattern out of shapes.

Your goal is to:

- Use a modern React stack.
- Use the shapes in `data/motifs/`. Feel free to add your own.
- The tool should be optimised for someone who is not a designer and has no vocabulary for any of this.

The engineering is the small part of this. We hope you will spend your time on the things you can only settle by looking at them — scale, spacing, colour, what happens where it repeats, and which of the many things you could expose actually deserve a control. We would rather see a few decisions made well than every feature made adequately, so take the extra time to embed some of your opinions on user experience. We will judge results based on the depth and quality of the outcome. You are expected (and encouraged!) to use AI tools to complete this task.

In the in-person phase of the interview, we will ask you about the code, and ask questions about the product decisions you have made.
