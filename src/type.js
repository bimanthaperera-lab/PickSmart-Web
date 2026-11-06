// Bold headings that react to the pointer: letters near it get lighter, like the lens
// showing what's underneath. Screen readers get the plain text; the letters are decoration.

const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const RADIUS = 170; // px around the pointer that's affected
const LIGHTEST = 280; // weight right under the pointer

export function initKinetic(selector) {
  const heads = [];
  const words = [];

  for (const h of document.querySelectorAll(selector)) {
    const text = h.textContent.trim();
    if (!text) continue;
    h.textContent = "";
    const plain = document.createElement("span");
    plain.className = "sr-only";
    plain.textContent = text;
    const shown = document.createElement("span");
    shown.setAttribute("aria-hidden", "true");
    const letters = [];
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) return shown.append(" ");
      const word = document.createElement("span");
      word.className = "kinetic__word";
      for (const ch of part) {
        const c = document.createElement("span");
        c.className = "kinetic__ch";
        c.textContent = ch;
        word.append(c);
        letters.push(c);
      }
      shown.append(word);
      words.push(word);
    });
    h.append(plain, shown);
    heads.push({ el: h, letters, rest: 800 });
  }

  // Each word keeps its bold width, so lighter letters never reflow the line.
  const lock = () => {
    words.forEach((w) => (w.style.width = ""));
    heads.forEach((h) => {
      h.letters.forEach((c) => c.style.removeProperty("--w"));
      h.rest = parseFloat(getComputedStyle(h.el).fontWeight) || 800;
    });
    const widths = words.map((w) => w.getBoundingClientRect().width);
    words.forEach((w, i) => (w.style.width = `${widths[i]}px`));
  };
  lock();
  document.fonts.ready.then(lock);
  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(lock, 150);
  });

  let px = -9999;
  let py = -9999;
  let queued = false;

  const update = () => {
    queued = false;
    const active = finePointer.matches && !reduceMotion.matches;
    for (const h of heads) {
      const box = h.el.getBoundingClientRect();
      const near =
        active && py > box.top - RADIUS && py < box.bottom + RADIUS && px > box.left - RADIUS && px < box.right + RADIUS;
      if (!near && !h.touched) continue;
      h.touched = near;
      for (const c of h.letters) {
        let w = h.rest;
        if (near) {
          const r = c.getBoundingClientRect();
          const d = Math.hypot(r.left + r.width / 2 - px, r.top + r.height / 2 - py);
          const t = Math.max(0, 1 - d / RADIUS);
          w = h.rest - (h.rest - LIGHTEST) * t * t * (3 - 2 * t);
        }
        const v = Math.round(w / 10) * 10;
        if (c._w !== v) {
          c._w = v;
          if (v === h.rest) c.style.removeProperty("--w");
          else c.style.setProperty("--w", v);
        }
      }
    }
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    px = e.clientX;
    py = e.clientY;
    queue();
  });
  // Scrolling moves the headings under a still pointer.
  addEventListener("scroll", queue, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    px = py = -9999;
    queue();
  });
}
