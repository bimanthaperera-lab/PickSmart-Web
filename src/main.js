import { site } from "../data/site.js";
import { scroll as config } from "../data/scroll.js";
import { story, build, destroy, sampleAt, beatScroll, setPointer, W, H } from "./story.js";
import { lens, initLens } from "./lens.js";
import { initKinetic } from "./type.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const mobile = matchMedia(`(max-width: ${config.mobileBelow - 0.02}px)`);

/* ---------- Content from data/site.js ---------- */

function bind(key, apply) {
  document.querySelectorAll(`[data-bind="${key}"]`).forEach(apply);
}
const text = (key, value) => bind(key, (el) => (el.textContent = value));
const make = (tag, className, content) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
};

// An image with a small and a large file. Never blocks the text.
function picture(img, { src, small, size, alt }, sizes = "(max-width: 767px) 92vw, 50vw") {
  img.src = small ?? src;
  if (small) img.srcset = `${small} ${Math.round(size[0] * 0.5625)}w, ${src} ${size[0]}w`;
  img.sizes = sizes;
  [img.width, img.height] = size;
  img.decoding = "async";
  img.loading = "lazy";
  img.alt = alt ?? "";
}

const mailto = `mailto:${site.email}?subject=${encodeURIComponent("Picksmart early access")}`;
text("description", site.description);
text("year-now", new Date().getFullYear());
bind("email", (el) => {
  el.textContent = site.email;
  el.href = mailto;
});
bind("email-link", (el) => (el.href = mailto));
bind("privacy-link", (el) => (el.href = site.privacyPolicy));
text("hero-title", site.hero.title);
text("hero-summary", site.hero.summary);

// Google Play: a real link once there is one, a "coming soon" badge until then.
{
  const badge = document.querySelector("[data-play]");
  if (site.playStore) {
    const a = document.createElement("a");
    a.className = badge.className;
    a.href = site.playStore;
    a.innerHTML = badge.innerHTML;
    a.querySelector("[data-play-note]").textContent = "Get it on";
    badge.replaceWith(a);
  } else {
    badge.setAttribute("role", "note");
  }
}

// Where the money goes: the rows, and the bar's parts as shares of the fare.
{
  const bd = site.hero.breakdown;
  text("breakdown-heading", bd.heading);
  const list = document.querySelector("[data-breakdown-rows]");
  const panel = document.querySelector("[data-breakdown]");
  bd.rows.forEach((row, i) => {
    const div = make("div", `breakdown__row breakdown__row--${row.kind}`);
    div.dataset.row = i;
    div.style.setProperty("--i", i);
    const dt = make("dt", "", row.label);
    const dd = make("dd", "", row.value);
    if (row.note) dd.append(make("small", "", row.note));
    div.append(dt, dd);
    list.append(div);
    if (row.share !== undefined) panel.style.setProperty(`--share-${row.kind}`, row.share);
  });
}

const still = document.querySelector("[data-hero-still]");
still.src = site.hero.layers.final.src;
still.alt = site.hero.layers.final.alt;
still.width = W;
still.height = H;

/* Features: text, and the screen as an image for wherever the phone isn't. */
const workList = document.querySelector("[data-work]");
site.projects.forEach((feature, i) => {
  const li = make("li", "work-item");
  li.dataset.project = i;
  const body = make("div", "work-item__text");
  body.append(
    make("p", "work-item__meta", feature.kicker),
    make("h3", "work-item__title", feature.title),
    make("p", "work-item__summary", feature.summary),
  );
  const img = make("img", "work-item__image");
  img.loading = "lazy";
  img.decoding = "async";
  img.width = W;
  img.height = H;
  img.src = feature.image;
  img.alt = feature.alt;
  li.append(body, img);
  workList.append(li);
});

/* Vehicles */
text("fleet-heading", site.fleet.heading);
text("fleet-lead", site.fleet.lead);
text("fleet-note", site.fleet.note);
picture(document.querySelector("[data-fleet-img]"), site.fleet.image);

/* No magic: each part of the check, with its maths. The crop is the static version of the zoom. */
text("about-heading", site.about.heading);
text("about-lead", site.about.lead);
picture(document.querySelector("[data-costs-img]"), site.about.image);

const highlight = (code) =>
  code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/(Rs\. [\d,.]+|Good|\d+%)/g, '<mark class="tok">$1</mark>');

const exampleList = document.querySelector("[data-examples]");
site.about.examples.forEach((ex, i) => {
  const li = make("li", "example");
  li.dataset.example = i;
  li.innerHTML = `
    <div class="example__body">
      <div class="example__text">
        <h3 class="example__title"></h3>
        <p class="example__screen"></p>
        <p class="example__build"></p>
      </div>
      <figure class="example__figure">
        <div class="crop"><img decoding="async" loading="lazy" /></div>
        <pre class="snippet"><code></code></pre>
      </figure>
    </div>`;
  li.querySelector(".example__title").textContent = ex.title;
  li.querySelector(".example__screen").textContent = ex.screen;
  li.querySelector(".example__build").textContent = ex.build;

  const focus = config.full.decisions[i]?.focus ?? { x: 0, y: 0, w: W, h: H };
  const { x, y, w, h } = focus;
  const crop = li.querySelector(".crop");
  crop.style.aspectRatio = `${w} / ${h}`;
  const img = crop.querySelector("img");
  img.src = site.hero.layers.final.src;
  img.alt = ex.alt;
  img.width = W;
  img.height = H;
  img.style.width = `${(W / w) * 100}%`;
  img.style.left = `${(-x / w) * 100}%`;
  img.style.top = `${(-y / h) * 100}%`;

  const pre = li.querySelector(".snippet");
  pre.querySelector("code").innerHTML = highlight(ex.snippet);
  pre.setAttribute("aria-label", `The maths: ${ex.title}`);
  exampleList.append(li);
});

// Code that scrolls sideways must be reachable by keyboard; code that fits stays out of the tab order.
function updateSnippetFocus() {
  document.querySelectorAll(".snippet").forEach((pre) => {
    if (pre.scrollWidth > pre.clientWidth + 1) pre.tabIndex = 0;
    else pre.removeAttribute("tabindex");
  });
}

/* Story: the offer, four beats */
const tale = site.story;
text("story-kicker", tale.kicker);
{
  // "Know your real profit" in white, "before you ride." in yellow.
  const nameEl = document.querySelector("[data-story-name]");
  const cut = site.tagline.indexOf(" before");
  nameEl.textContent = cut > 0 ? site.tagline.slice(0, cut) + " " : site.tagline;
  if (cut > 0) nameEl.append(make("span", "story__last", site.tagline.slice(cut + 1)));

  const beats = document.querySelector("[data-beats]");
  tale.beats.forEach((b, i) => {
    const li = make("li", "beat");
    li.dataset.beat = i + 1;
    li.append(make("p", "beat__when", b.label), make("p", "beat__text", b.text));
    beats.append(li);
  });

  // The illustration: in the page flow for phones and the static page, and as a fixed layer
  // behind the 3D canvas for the full sequence.
  const flowImg = document.querySelector("[data-story-img]");
  picture(flowImg, tale.image);
  const stageImg = document.querySelector("[data-stage-art]");
  picture(stageImg, { ...tale.image, alt: "" });
  stageImg.loading = "eager";
  stageImg.setAttribute("fetchpriority", "high");

  // Keyboard: focusing something in a beat that isn't on screen scrolls the story to it.
  document.querySelectorAll(".story [data-beat]").forEach((el) => {
    el.addEventListener("focusin", () => {
      if (mode !== "full") return;
      const y = beatScroll(+el.dataset.beat);
      if (y !== null && Math.abs(scrollY - y) > 4) scrollTo({ top: y });
    });
  });

  // The floating illustration tilts towards the mouse (not on phones). See story.js.
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  addEventListener("pointermove", (e) => {
    if (mode !== "full" || !fine.matches || e.pointerType !== "mouse") return;
    setPointer((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
  });
  // Mouse gone: level out again.
  document.documentElement.addEventListener("pointerleave", () => setPointer(0, 0));
}

/* While you ride */
text("stack-heading", site.stack.heading);
const stackList = document.querySelector("[data-stack]");
site.stack.groups.forEach((group, i) => {
  const li = make("li", "stack-group");
  li.style.setProperty("--i", i);
  const status = make("p", "stack-group__status", group.status);
  status.dataset.status = /planned/i.test(group.status) ? "planned" : /testing/i.test(group.status) ? "testing" : "ready";
  li.append(make("h3", "stack-group__label", group.label), status, make("p", "stack-group__items", group.text));
  if (group.image) {
    const slot = make("div", "stack-group__icon");
    slot.setAttribute("aria-hidden", "true");
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.src = group.image;
    slot.append(img);
    li.prepend(slot);
  }
  stackList.append(li);
});

/* Privacy */
text("privacy-heading", site.privacy.heading);
const privacyList = document.querySelector("[data-privacy]");
for (const point of site.privacy.points) privacyList.append(make("li", "", point));

/* Plans */
text("plans-heading", site.plans.heading);
text("plans-lead", site.plans.lead);
const planList = document.querySelector("[data-plans]");
for (const tier of site.plans.tiers) {
  const li = make("li", "plan");
  const items = make("ul", "plan__items");
  for (const item of tier.items) items.append(make("li", "", item));
  li.append(make("h3", "plan__name", tier.name), make("p", "plan__note", tier.note), items);
  planList.append(li);
}

/* The end: the rider at dawn */
text("contact-heading", site.contact.heading);
text("contact-note", site.contact.note);
picture(document.querySelector("[data-dawn-img]"), site.contact.image, "100vw");

const copyButton = document.querySelector("[data-copy-email]");
const copyStatus = document.querySelector("[data-copy-status]");
let copyTimer;
copyButton.addEventListener("click", async () => {
  clearTimeout(copyTimer);
  try {
    await navigator.clipboard.writeText(site.email);
    copyButton.textContent = "Copied";
    copyStatus.textContent = `Copied ${site.email} to the clipboard.`;
  } catch {
    getSelection().selectAllChildren(document.querySelector(".contact__email"));
    copyStatus.textContent = "Couldn't copy automatically. The address is selected, so copy it with your keyboard.";
  }
  copyTimer = setTimeout(() => {
    copyButton.textContent = "Copy email";
    copyStatus.textContent = "";
  }, 4000);
});

/* ---------- Which version of the page ---------- */

// full:   one phone, story to plans, with the lens.
// lite:   phones. The hero sequence without the lens; images and code panels after it.
// static: reduced motion or no WebGL. Images and code panels in the normal flow.

let webgl = (() => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
})();

// Dev only: ?mode=static (or lite/full) to check each version without changing system settings.
const forced = import.meta.env.DEV ? new URLSearchParams(location.search).get("mode") : null;
// Very low-end devices (2 cores or 2 GB) get the static page rather than a juddering one.
const lowPower = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;
const pickMode = () =>
  forced ?? (reduceMotion.matches || !webgl || lowPower ? "static" : mobile.matches ? "lite" : "full");

const sceneHost = document.querySelector("[data-canvas]");
let unmount = null;
let mounting = null;
let mode = null;

async function setMode(next) {
  if (next === mode) return relayout();
  mode = next;
  document.documentElement.dataset.mode = mode;
  updateSnippetFocus();
  if (mode === "static") {
    unmount?.();
    unmount = null;
    destroy();
    return;
  }
  build(mode);
  if (!unmount && !mounting) {
    // The 3D phone isn't needed for the first screen (the story comes first), so load it
    // once the page is idle: the text and the illustration are never held up by it.
    // (Opening the page part-way down, e.g. after a reload, loads it straight away instead.)
    const idle = (fn) =>
      scrollY > innerHeight
        ? fn()
        : "requestIdleCallback" in window
          ? requestIdleCallback(fn, { timeout: 1200 })
          : setTimeout(fn, 300);
    mounting = new Promise((resolve) => idle(resolve))
      .then(() => import("./scene/mount.jsx"))
      .then(({ mountScene }) => {
        if (mode === "static") {
          mounting = null;
          return;
        }
        unmount = mountScene(sceneHost, {
          onLost: () => {
            // The GPU dropped the canvas: show the static page instead of a blank one.
            webgl = false;
            setMode("static");
          },
        });
        mounting = null;
        relayout();
      });
  }
}

let resizeTimer;
function relayout() {
  if (mode === "static" || !mode) return;
  build(mode);
}

addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    updateSnippetFocus();
    setMode(pickMode());
  }, 120);
});
reduceMotion.addEventListener("change", () => setMode(pickMode()));
mobile.addEventListener("change", () => setMode(pickMode()));

initLens(story);
initKinetic(".hero__title, .section-title");
setMode(pickMode());
document.fonts.ready.then(() => {
  updateSnippetFocus();
  relayout();
});
addEventListener("load", relayout);

// Images and fonts arriving change where sections are; re-measure the story when they do.
let lastHeight = 0;
let heightTimer;
new ResizeObserver(() => {
  const h = document.documentElement.scrollHeight;
  if (Math.abs(h - lastHeight) < 2) return;
  lastHeight = h;
  clearTimeout(heightTimer);
  heightTimer = setTimeout(relayout, 80);
}).observe(document.querySelector("main"));

export { lens };

if (import.meta.env.DEV) Object.assign(window, { __story: story, __sampleAt: sampleAt });
