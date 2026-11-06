// The lens: where it is, where it's going, and how the reader moves it.
// The 3D scene draws what's under it and places the ring; this file only handles input.

const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const lens = {
  el: null,
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  r: 0,
  moved: false,
  dragging: false,
  parked: false,
  introStart: null, // performance.now() when the opening animation starts
  introDone: false,
};

export function initLens(story) {
  const el = document.querySelector("[data-lens]");
  lens.el = el;
  const active = () => story.mode === "full" && (story.frame?.lens ?? 0) > 0.02;

  const setTarget = (x, y) => {
    lens.tx = clamp(x, 0, story.view.vw);
    lens.ty = clamp(y, 0, story.view.vh);
    lens.moved = true;
    story.invalidate();
  };

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !finePointer.matches || !active()) return;
    setTarget(e.clientX, e.clientY);
  });

  // Touch and pen: drag the lens itself.
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    el.setPointerCapture(e.pointerId);
    lens.dragging = true;
  });
  el.addEventListener("pointermove", (e) => {
    if (!el.hasPointerCapture(e.pointerId)) return;
    setTarget(e.clientX, e.clientY);
  });
  const stop = () => (lens.dragging = false);
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);

  el.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 72 : 24;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setTarget(lens.tx + move[0], lens.ty + move[1]);
  });
}
