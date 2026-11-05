/**
 * The tests run in happy-dom, a small browser stand-in. It has no canvas, so
 * Path2D (which the shapes are parsed into) is a stand-in that only records
 * that it was built. Tests check where things go, not pixels.
 */
if (typeof globalThis.Path2D === 'undefined') {
  class Path2DStub {
    addPath() {}
    moveTo() {}
    lineTo() {}
    arc() {}
    ellipse() {}
    rect() {}
    closePath() {}
  }
  Object.assign(globalThis, { Path2D: Path2DStub })
}
