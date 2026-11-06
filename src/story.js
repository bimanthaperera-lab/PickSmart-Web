// One scroll story for the whole page: data/scroll.js -> keyframes -> one GSAP timeline.
// The timeline only moves a single number, `k` (which keyframe we're at). Everything the
// phone and the page do is read from k, so scrolling back up plays it all in reverse.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scroll as config } from "../data/scroll.js";
import { site } from "../data/site.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export const W = site.hero.size.width;
export const H = site.hero.size.height;

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

const BASE = {
  rotation: [0, 0, 0],
  offset: [0, 0],
  gap: 0,
  labels: 0,
  lens: 0,
  backdrop: 0,
  copy: 1,
  breakdown: 0, // the hero's "where the money goes" panel, 0..1
  highlight: 0,
  device: 0,
  focus: null,
  screen: "hero",
  opacity: 1, // the phone
  grid: 0, // the story's grid backdrop
  art: { x: 0.7, y: 0.54, h: 0.9, w: 0.52, ry: 0, rz: 0, opacity: 0, depth: 1 }, // the story illustration
  beat: -1, // which story beat's text is showing
};

const ART = ["x", "y", "h", "w", "ry", "rz", "opacity", "depth"];

// The intro video's box: the 1280 x 720 frame with 100 px of headroom above it (in the
// video's own background colour, see .intro-video). A little wider than the illustration
// is allowed to be, since its edges fade away.
const VIDEO_BOX = [1280, 820];
const VIDEO_WIDER = 1.12;
// The video plays on the first screen and hands over to the illustration by this keyframe.
const VIDEO_OUT = 0.6;

// Shared with the 3D scene. The scene reads `frame` and `view`; we call `invalidate`.
export const story = {
  mode: "static",
  view: { vw: 1, vh: 1 },
  keys: [],
  frame: null,
  maxGap: 1,
  maxScroll: 1,
  phoneReady: false, // the 3D phone has drawn at least once
  labelPx: 18,
  liftIndex: -1,
  lift: null,
  invalidate: () => {},
};

let tl = null;
let trigger = null;
const state = { k: 0 };

/* ---------- Config -> keyframes ---------- */

function expand(mode) {
  const c = config[mode];
  const list = [];
  const push = (id, entry, extra = {}) => {
    const prev = list[list.length - 1] ?? BASE;
    const { at, ease, ...props } = entry;
    const art = props.art ? { ...prev.art, opacity: 1, ...props.art } : prev.art;
    list.push({
      ...prev,
      focus: null,
      highlight: 0,
      device: 0,
      scrollWith: false,
      follow: false,
      beat: -1,
      ride: null,
      ...props,
      ...extra,
      art,
      id,
      at,
      ease,
    });
  };

  if (mode === "full") {
    // The story: the phone waits, invisible, exactly where the illustration's phone is.
    const s = c.story;
    const hidden = { place: { lift: true }, opacity: 0, lens: 0, backdrop: 1, grid: 1, screen: "hero" };
    s.beats.forEach((b, i) => push(`beat-${i}`, { ...hidden, ...b }, { beat: i }));
    push("lift", { ...s.lift, opacity: 1 }, { beat: s.beats.length - 1 });
    // `follow`: on the way here the illustration stays anchored behind the 3D phone.
    push("pickSmart", { ...c.hero, lens: 0, grid: 1, ...s.pickSmart }, { beat: s.beats.length, follow: true });
    push("hero", { ...c.hero, grid: 0 });
    push("lensOff", c.lensOff);
    if (c.apart) push("apart", c.apart);
    if (c.breakdown) push("breakdown", c.breakdown);
    site.projects.forEach((p, i) => {
      const at = i === 0 ? c.projects.at : { el: `[data-project="${i}"]`, ...c.projects.next };
      const { next, monitor, ...pose } = c.projects;
      const desk = p.device === "monitor";
      push(
        `project-${i}`,
        {
          ...pose,
          at,
          device: desk ? 1 : 0,
          ...(desk && { ...monitor, place: { ...pose.place, footprint: monitorFootprint() } }),
        },
        // The same image as the hero is the same screen: no wipe between them.
        { screen: p.screen && p.screen !== site.hero.layers.final.src ? `project:${i}` : "hero" },
      );
    });
    push("about", c.about);
    c.decisions.slice(0, site.about.examples.length).forEach((d, i) => {
      push(`decision-${i}`, { ...d, at: { el: `[data-example="${i}"]`, ...d.at } }, { highlight: 1, example: i });
    });
    push("stack", c.stack);
    if (c.privacy) push("privacy", c.privacy);
    if (c.leave) push("leave", c.leave);
  } else {
    for (const [id, entry] of Object.entries(c)) push(id, entry);
  }
  return list;
}

// The whole monitor, screen to foot, for fitting it into its place.
export function monitorFootprint() {
  const m = config.monitor;
  return [m.screen[0] + m.bezel * 2, m.screen[1] + m.bezel * 2 + m.neck[1] + m.base[1]];
}

/* ---------- Where things are ---------- */

function grid(vw) {
  const gutter = clamp(innerWidth * 0.04, 20, 56);
  const gap = 24;
  const col = (vw - gutter * 2 - gap * 11) / 12;
  return {
    start: (c) => gutter + (c - 1) * (col + gap),
    end: (c) => gutter + c * col + (c - 1) * gap,
  };
}

const docTop = (el) => el.getBoundingClientRect().top + scrollY;

// Viewport-space box the phone is fitted into.
function slot(place, view, maxScroll) {
  const { vw, vh } = view;
  let x0, x1;
  if (place.cols) {
    const g = grid(vw);
    x0 = g.start(place.cols[0]);
    x1 = g.end(place.cols[1]);
  } else {
    x0 = place.x[0] * vw;
    x1 = place.x[1] * vw;
  }
  let y0 = place.y[0] * vh;
  let y1 = place.y[1] * vh;
  if (place.below) {
    // A sticky element: measure it against its sticky parent, which sits at the top.
    const el = document.querySelector(place.below);
    if (el) y0 = el.getBoundingClientRect().bottom - el.offsetParent.getBoundingClientRect().top;
  }
  if (place.within) {
    // An element at the end of the page: where it sits once you've scrolled to the bottom.
    const el = document.querySelector(place.within);
    if (el) {
      const top = docTop(el) - maxScroll;
      y0 = Math.max(top, place.y[0] * vh);
      y1 = Math.min(top + el.offsetHeight, place.y[1] * vh);
    }
  }
  const inset = place.inset ?? {};
  x0 += inset.left ?? 0;
  x1 -= inset.right ?? 0;
  y0 += inset.top ?? 0;
  y1 -= inset.bottom ?? 0;
  if (y1 - y0 < vh * 0.4) y0 = y1 - vh * 0.4;
  return { x0, x1, y0, y1 };
}

// Where an area of an image ends up on screen once the page is scrolled to the bottom.
// Handles object-fit: contain with object-position: bottom, as the avatar uses.
function onImage(hand, maxScroll) {
  const img = document.querySelector(hand.el);
  if (!img) return null;
  const box = img.getBoundingClientRect();
  const nw = img.naturalWidth || +img.getAttribute("width");
  const nh = img.naturalHeight || +img.getAttribute("height");
  if (!nw || !nh || !box.width) return null;
  const k = Math.min(box.width / nw, box.height / nh);
  const left = box.left + (box.width - nw * k) / 2;
  const top = docTop(img) - maxScroll + (box.height - nh * k);
  return { cx: left + hand.center[0] * k, cy: top + hand.center[1] * k, s: (hand.height * k) / H };
}

// Where the illustration is for a beat, in px: centre and height.
// `size` is the shape of what's placed: the illustration by default.
function artBox(art, view, size = site.story.image.size) {
  const [iw, ih] = size;
  const h = Math.min(art.h * view.vh, (art.w * view.vw * ih) / iw);
  return { cx: art.x * view.vw, cy: art.y * view.vh, h, w: (h * iw) / ih };
}

// The phone in the illustration, for the art pose of the last story beat (straight on).
function liftPose(view) {
  const s = config.full.story;
  const art = s.beats[s.beats.length - 1].art;
  const box = artBox(art, view);
  const k = box.h / site.story.image.size[1]; // the phone is measured in the image's own pixels
  const [rx, ry, rz] = s.phone.rotation;
  return {
    cx: box.cx - box.w / 2 + s.phone.center[0] * k,
    cy: box.cy - box.h / 2 + s.phone.center[1] * k,
    s: (s.phone.height * k) / H,
    rx,
    ry,
    rz,
  };
}

function pose(key, view, maxScroll) {
  if (key.place.lift) return liftPose(view);
  if (key.place.hand) {
    const at = onImage(key.place.hand, maxScroll);
    const [rx, ry, rz] = key.rotation;
    if (at) return { ...at, rx, ry, rz };
  }
  const r = slot(key.place, view, maxScroll);
  const sw = r.x1 - r.x0;
  const sh = r.y1 - r.y0;
  let s, cx, cy;
  if (key.focus) {
    const f = key.focus;
    // Fill the box with the focus area, but never let the phone get wider than the box:
    // the box is the phone's column, and the text is next to it.
    s = Math.min(sw / f.w, sh / f.h, sw / W) * 0.94;
    cx = (r.x0 + r.x1) / 2 - (f.x + f.w / 2 - W / 2) * s;
    cx = clamp(cx, r.x0 + (W * s) / 2, r.x1 - (W * s) / 2);
    cy = (r.y0 + r.y1) / 2 - (f.y + f.h / 2 - H / 2) * s;
  } else {
    const [fw, fh] = key.place.footprint ?? [W, H];
    s = Math.min(sw / fw, sh / fh) * (key.place.zoom ?? 1);
    cx = (r.x0 + r.x1) / 2;
    cy = (r.y0 + r.y1) / 2;
  }
  cx += key.offset[0] * view.vw;
  cy += key.offset[1] * view.vh;
  const [rx, ry, rz] = key.rotation;
  return { cx, cy, s, rx, ry, rz };
}

function range(at, view, maxScroll) {
  const el = typeof at.el === "string" ? document.querySelector(at.el) : at.el;
  if (!el) return [maxScroll, maxScroll];
  const top = docTop(el);
  if (at.span) {
    const len = Math.max(el.offsetHeight - view.vh, 1);
    return [top + at.span[0] * len, top + at.span[1] * len];
  }
  return [top - at.from * view.vh, top - at.to * view.vh];
}

/* ---------- k -> what's on screen ---------- */

function frameAt(k, y = scrollY) {
  const keys = story.keys;
  const n = keys.length;
  const i = clamp(Math.floor(k), 0, n - 2);
  const f = clamp(k - i);
  const a = keys[i];
  const b = keys[i + 1];
  const p = {};
  for (const name of ["cx", "cy", "s", "rx", "ry", "rz"]) p[name] = lerp(a.pose[name], b.pose[name], f);
  // A pose that rides with the page: measured at the bottom of the page, so shift it by
  // how far there is still to scroll.
  const ride = Math.max(story.maxScroll - y, 0);
  p.cy += lerp(a.scrollWith ? ride : 0, b.scrollWith ? ride : 0, f);
  // Riding in with a section from below: until it reaches the top, follow it.
  const comeIn = (key) => (key.rideTop !== undefined ? Math.max(key.rideTop - y, 0) : 0);
  p.cy += lerp(comeIn(a), comeIn(b), f);
  p.opacity = lerp(a.opacity, b.opacity, f);
  p.grid = lerp(a.grid, b.grid, f);
  p.art = {};
  for (const n of ART) p.art[n] = lerp(a.art[n], b.art[n], f);
  // 0..1 through the hand-off from the illustration to the 3D phone.
  p.follow = b.follow ? f : 0;
  // 1 while the story is told (the illustration floats), 0 once the 3D phone lifts out of it.
  p.calm = story.liftIndex >= 0 ? clamp((story.liftIndex - k) / 0.6) : 0;
  for (const name of ["gap", "labels", "lens", "backdrop", "copy", "highlight", "device", "breakdown"]) p[name] = lerp(a[name], b[name], f);

  // From one focus area to another, the outline fades out and comes back on the new one,
  // instead of sliding across parts of the screen it isn't about.
  if (a.focus && b.focus && a.focus !== b.focus) {
    p.focus = f < 0.5 ? a.focus : b.focus;
    p.highlight *= Math.abs(1 - 2 * f);
  } else {
    p.focus = a.focus ?? b.focus;
  }
  p.screenA = a.screen;
  p.screenB = b.screen;
  p.wipe = a.screen === b.screen ? 0 : f;
  p.layers = clamp((p.gap / story.maxGap) * 6);
  p.k = k;
  return p;
}

/* ---------- Page effects that ride on the same timeline ---------- */

const dom = {};

/* The illustration floating in 3D. Scroll sets where it is (`drawn`); a small animation loop
   adds the bob, the sway and the tilt towards the pointer on top, only while it's floating. */

const drawn = { box: null, ry: 0, rz: 0, opacity: 0, calm: 0 };
const pointer = { x: 0, y: 0, sx: 0, sy: 0 }; // -1..1 from the centre; sx, sy smoothed
let floatRaf = 0;
let floatLast = 0;

// From main.js: where the mouse is, -1..1 across the window.
export function setPointer(x, y) {
  pointer.x = x;
  pointer.y = y;
  wakeFloat();
}

function writeArt() {
  const el = dom.art;
  const { box } = drawn;
  if (!el || !box) return;
  const fl = config.full.story.float;
  const c = drawn.calm;
  const t = performance.now() / 1000;
  const wave = (s) => Math.sin((t / s) * Math.PI * 2);
  const bob = wave(fl.seconds) * fl.height * c;
  const sway = wave(fl.seconds * 1.7) * fl.sway * c;
  // Turns towards the pointer, and drifts a few px against it for depth.
  const rx = -pointer.sy * fl.tilt[0] * c;
  const ry = pointer.sx * fl.tilt[1] * c;
  const dx = -pointer.sx * 10 * c;
  const dy = -pointer.sy * 8 * c;
  el.style.width = `${box.w.toFixed(1)}px`;
  el.style.height = `${box.h.toFixed(1)}px`;
  el.style.transform =
    `translate3d(${(box.cx - box.w / 2 + dx).toFixed(1)}px, ${(box.cy - box.h / 2 + dy + bob).toFixed(1)}px, 0) ` +
    `perspective(${fl.perspective}px) rotateX(${rx.toFixed(2)}deg) rotateY(${(drawn.ry + ry).toFixed(2)}deg) ` +
    `rotateZ(${(drawn.rz + sway).toFixed(2)}deg)`;
  el.style.opacity = drawn.opacity.toFixed(3);
  el.style.visibility = drawn.opacity < 0.01 ? "hidden" : "visible";
}

const floating = () => story.mode === "full" && drawn.calm > 0.001 && drawn.opacity > 0.01 && !document.hidden;

function floatTick(now) {
  floatRaf = 0;
  const dt = Math.min(Math.max(now - floatLast, 0) / 1000, 0.1);
  floatLast = now;
  const follow = 1 - Math.pow(0.9, dt * 60);
  pointer.sx += (pointer.x - pointer.sx) * follow;
  pointer.sy += (pointer.y - pointer.sy) * follow;
  writeArt();
  if (floating()) floatRaf = requestAnimationFrame(floatTick);
}

function wakeFloat() {
  if (floatRaf || !floating()) return;
  floatLast = performance.now();
  floatRaf = requestAnimationFrame(floatTick);
}

document.addEventListener("visibilitychange", wakeFloat);

function applyPage(frame) {
  dom.backdrop ??= document.querySelector("[data-backdrop]");
  dom.copy ??= document.querySelector(".hero__copy");
  dom.panels ??= [...document.querySelectorAll("[data-example] .snippet")];
  dom.root ??= document.documentElement;

  dom.backdrop.style.opacity = frame.backdrop.toFixed(3);
  dom.grid ??= document.querySelector("[data-grid]");
  dom.grid.style.opacity = frame.grid.toFixed(3);

  // The story illustration and the beat that's showing.
  if (story.mode === "full") {
    dom.art ??= document.querySelector(".stage-art img");
    dom.beats ??= [...document.querySelectorAll(".story [data-beat]")];
    dom.video ??= document.querySelector("[data-stage-video]");
    const a = frame.art;
    // The intro video (hidden when it isn't used) fades into the illustration in the same spot.
    const video = dom.video && !dom.video.hidden ? dom.video : null;
    const intro = video ? clamp(1 - frame.k / VIDEO_OUT) : 0;

    let box = artBox(a, story.view);
    let opacity = a.opacity * (1 - intro);
    if (frame.follow > 0 && story.lift) {
      // The hand-off: the drawn phone stays exactly behind the 3D one while the 3D phone
      // comes forward, so there's only ever one phone. The person shrinks back into the page.
      const { box: b0, phone } = story.lift;
      const k = (frame.s / phone.s) * a.depth;
      box = {
        cx: frame.cx - (phone.cx - b0.cx) * k,
        cy: frame.cy - (phone.cy - b0.cy) * k,
        w: b0.w * k,
        h: b0.h * k,
      };
      opacity = opacity ** 3; // Mostly gone before the phones' outlines part.
    }
    Object.assign(drawn, { box, ry: a.ry, rz: a.rz, opacity, calm: frame.calm });
    writeArt();
    wakeFloat();

    if (video) {
      const vbox = artBox({ ...a, w: a.w * VIDEO_WIDER }, story.view, VIDEO_BOX);
      video.style.width = `${vbox.w.toFixed(1)}px`;
      video.style.height = `${vbox.h.toFixed(1)}px`;
      video.style.transform =
        `translate3d(${(vbox.cx - vbox.w / 2).toFixed(1)}px, ${(vbox.cy - vbox.h / 2).toFixed(1)}px, 0) ` +
        `rotateY(${a.ry.toFixed(2)}deg) rotateZ(${a.rz.toFixed(2)}deg)`;
      video.style.opacity = intro.toFixed(3);
      video.style.visibility = intro < 0.01 ? "hidden" : "visible";
      const v = video.querySelector("video");
      if (intro > 0.01 && v.paused) v.play().catch(() => {});
      else if (intro <= 0.01 && !v.paused) v.pause();
    }

    // Each beat: fully shown across its own keyframes, faded out half a step either side,
    // so one has gone before the next arrives.
    for (const el of dom.beats) {
      const i = +el.dataset.beat;
      const [k0, k1] = story.beatSpan[i] ?? [-9, -9];
      const d = Math.max(k0 - frame.k, frame.k - k1, 0);
      const t = clamp(1 - d / 0.5);
      el.style.opacity = t.toFixed(3);
      el.style.transform = t < 1 ? `translateY(${((frame.k < k0 ? 1 : -1) * (1 - t) * 28).toFixed(1)}px)` : "";
      el.style.visibility = t < 0.01 ? "hidden" : "visible";
    }
  }
  // Full: the hero text is gone in the first quarter of the breakdown step, before the
  // breakdown starts, so the two never share the space.
  const copyOpacity = story.mode === "full" ? clamp((frame.copy - 0.75) * 4) : frame.copy;
  dom.copy.style.opacity = copyOpacity.toFixed(3);
  dom.copy.style.visibility = copyOpacity < 0.01 ? "hidden" : "visible";

  // Where the money goes: each row comes in after the one before, and the bar loses each cost.
  if (story.mode === "full") {
    dom.breakdown ??= document.querySelector("[data-breakdown]");
    if (dom.breakdown) {
      const b = clamp((frame.breakdown - 0.25) / 0.75);
      const rows = dom.breakdown.querySelectorAll("[data-row]").length || 1;
      dom.breakdown.style.opacity = clamp(b * 5).toFixed(3);
      dom.breakdown.style.visibility = b < 0.01 ? "hidden" : "visible";
      for (let i = 0; i < rows; i++) dom.breakdown.style.setProperty(`--r${i}`, clamp(b * (rows + 0.5) - i).toFixed(3));
    }
  }

  // Each decision's code panel appears as the phone arrives at it, and stays.
  for (const key of story.keys) {
    if (key.example === undefined) continue;
    const panel = dom.panels[key.example];
    if (!panel) continue;
    const t = clamp((frame.k - (key.index - 0.65)) / 0.5);
    panel.style.opacity = t.toFixed(3);
    panel.style.transform = t < 1 ? `translateY(${((1 - t) * 16).toFixed(1)}px)` : "";
  }

  dom.root.toggleAttribute("data-lens-on", story.mode === "full" && frame.lens > 0.02);
}

function update() {
  story.frame = frameAt(state.k);
  applyPage(story.frame);
  story.invalidate();
}

// Redraw the page at the current scroll position (e.g. after the intro video drops out).
export function refresh() {
  if (tl) update();
}

/* ---------- Build (and rebuild on resize) ---------- */

export function build(mode) {
  destroy();
  story.mode = mode;
  if (mode === "static") return;

  const view = { vw: document.documentElement.clientWidth, vh: innerHeight };
  story.view = view;
  story.labelPx = mode === "full" ? 18 : 15;
  const maxScroll = Math.max(document.documentElement.scrollHeight - view.vh, 1);
  story.maxScroll = maxScroll;

  const keys = expand(mode);
  keys.forEach((key, index) => {
    key.index = index;
    key.pose = pose(key, view, maxScroll);
    if (key.ride) {
      const el = document.querySelector(key.ride);
      if (el) key.rideTop = docTop(el);
    }
  });
  story.keys = keys;
  story.liftIndex = keys.findIndex((key) => key.id === "lift");
  story.lift = null;
  if (mode === "full") {
    const beats = config.full.story.beats;
    story.lift = { box: artBox({ ...BASE.art, ...beats[beats.length - 1].art }, view), phone: liftPose(view) };
  }
  story.maxGap = Math.max(1, ...keys.map((k) => k.gap));
  // Which keyframes each story beat is on screen for.
  story.beatSpan = {};
  keys.forEach((key) => {
    if (key.beat < 0) return;
    const s = (story.beatSpan[key.beat] ??= [key.index, key.index]);
    s[1] = key.index;
  });

  tl = gsap.timeline({ paused: true, onUpdate: update });
  let last = 0;
  for (let j = 1; j < keys.length; j++) {
    let [start, end] = range(keys[j].at, view, maxScroll);
    start = clamp(Math.max(start, last), 0, maxScroll);
    end = clamp(Math.max(end, start + 1), 0, maxScroll + 1);
    last = end;
    keys[j].range = [Math.round(start), Math.round(end)];
    tl.fromTo(
      state,
      { k: j - 1 },
      { k: j, duration: end - start, ease: keys[j].ease ?? "power1.inOut", immediateRender: false },
      start,
    );
  }
  // Tech stack: the groups rise in one after another as the section comes up, and each
  // icon pops into place. On the same timeline, so it reverses when you scroll back.
  const groups = [...document.querySelectorAll(".stack-group")];
  const stackEl = document.querySelector(".stack");
  if (groups.length && stackEl) {
    const top = docTop(stackEl);
    const start = clamp(top - view.vh * 0.95, 0, maxScroll);
    const span = Math.max(clamp(top - view.vh * 0.3, 0, maxScroll) - start, 60);
    const each = span * 0.1;
    const dur = Math.max(span - each * (groups.length - 1), 30);
    const icons = groups.map((g) => g.querySelector(".stack-group__icon"));
    tl.fromTo(groups, { opacity: 0, y: 56 }, { opacity: 1, y: 0, duration: dur, stagger: each, ease: "power2.out" }, start);
    tl.fromTo(
      icons,
      { scale: 0.4, rotation: -18, y: 24 },
      { scale: 1, rotation: 0, y: 0, duration: dur * 0.8, stagger: each, ease: "back.out(2)" },
      start + dur * 0.15,
    );
  }

  // Timeline time = scroll position in px.
  tl.set({}, {}, Math.max(maxScroll, last));

  const smoothing = mode === "full" ? config.smoothing : 0;
  trigger = ScrollTrigger.create({
    start: 0,
    end: "max",
    scrub: smoothing > 0 ? smoothing : true,
    animation: tl,
  });
  // Jump straight to the current scroll position instead of catching up from the top.
  tl.progress(trigger.progress);
  const catchUp = trigger.getTween?.(); // false when scrub is locked to the scrollbar
  if (catchUp) catchUp.progress(1);
  update();
}

// Where to scroll to show a story beat (for keyboard focus). null when there's no story.
export function beatScroll(beat) {
  const key = story.keys.find((k) => k.beat === beat);
  if (!key) return null;
  return key.index === 0 ? 0 : key.range?.[1] ?? null;
}

// Dev check: what's on screen at a scroll position, without scrolling (no animation frames needed).
export function sampleAt(y, read) {
  if (!tl) return null;
  const was = tl.time();
  tl.time(y);
  const f = frameAt(state.k, y);
  const extra = read?.();
  tl.time(was);
  return read ? extra : f;
}

export function destroy() {
  trigger?.kill();
  tl?.kill();
  trigger = null;
  tl = null;
  state.k = 0;
  story.keys = [];
  story.frame = null;
  document.documentElement.removeAttribute("data-lens-on");
  // Leave the page as plain HTML: panels visible, hero text opaque.
  document.querySelectorAll("[data-example] .snippet").forEach((el) => {
    el.style.opacity = "";
    el.style.transform = "";
  });
  const copy = document.querySelector(".hero__copy");
  if (copy) {
    copy.style.opacity = "";
    copy.style.visibility = "";
  }
  const breakdown = document.querySelector("[data-breakdown]");
  if (breakdown) {
    breakdown.style.opacity = "";
    breakdown.style.visibility = "";
    for (let i = 0; i < 8; i++) breakdown.style.removeProperty(`--r${i}`);
  }
  document.querySelectorAll(".story [data-beat]").forEach((el) => {
    el.style.opacity = "";
    el.style.transform = "";
    el.style.visibility = "";
  });
  gsap.set(".stack-group, .stack-group__icon", { clearProps: "opacity,transform" });
}
