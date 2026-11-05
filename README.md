# tldraw pattern

A small web app for making a repeating pattern out of shapes, made for someone who isn't a designer.

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
