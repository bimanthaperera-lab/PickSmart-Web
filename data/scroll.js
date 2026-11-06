// The phone's path down the page. One phone, one timeline: each entry is where the
// phone is when that part of the page is on screen, and `at` says when it gets there.
//
// place      Where the phone sits on screen.
//            x: [left, right] as fractions of the viewport width, or
//            cols: [first, last] on the 12-column page grid.
//            y: [top, bottom] as fractions of the viewport height.
//            below: a selector; the phone starts under that element instead of at y[0].
//            within: a selector; the phone stays inside that element's height (at the page end).
//            inset: { left, right, top, bottom } in px, taken off the area above.
//            footprint: [w, h] the size to fit, in screen pixels of the app (default 898 x 2000).
//            zoom: multiplies the fitted size. offset: [x, y] moves it by fractions of the viewport.
// rotation   [x, y, z] in degrees, the same as CSS rotateX / rotateY / rotateZ.
// gap        Space between the screen's layers (not used on this site: 0 = one screen).
// breakdown  The hero's "where the money goes" panel: 0 hidden, 1 every row shown.
// copy       The hero text's opacity.
// focus      An area of the app screen, in its own pixels (898 x 2000). The phone zooms so this
//            area fills `place`, and it's outlined. Also used for the static crops.
// opacity    The phone's own opacity (0 = gone).
// at         When the phone arrives here. { el, from, to }: while el's top edge moves from
//            `from` to `to` (fractions of the viewport height, 1 = bottom edge).
//            { el, span: [a, b] }: between fractions a and b of el's own scroll length.

// The lite hero phone sits under the hero text.
const litePhone = { x: [0.1, 0.9], y: [0, 1], below: ".hero__copy", inset: { top: 24, bottom: 24 } };

// Check a Ride, in its own pixels: the three parts "No magic" walks through.
const FARE = { x: 40, y: 281, w: 818, h: 457 };
const DISTANCE = { x: 40, y: 767, w: 818, h: 294 };
const RESULT = { x: 40, y: 1208, w: 818, h: 562 };

export const scroll = {
  // Below this width the page is one column: the lighter sequence, no lens.
  mobileBelow: 768,
  // Kept for screens shown on a desktop monitor (not used by the Picksmart site).
  monitor: { screen: [1900, 1021], bezel: 26, corner: 18, neck: [150, 160], base: [560, 34] },

  // Seconds the phone takes to catch up with the scrollbar. 0 = locked to it.
  smoothing: 0.5,

  full: {
    // The rider's story before the app. Four beats over about three screen heights.
    // `art` is where the illustration (site.story.image) sits for each beat:
    // x, y = its centre as fractions of the viewport; h, w = the largest it may be, as
    // fractions of the viewport height and width; ry, rz = turn and tilt in degrees.
    story: {
      // The phone in the rider's hand, in the illustration's own pixels (site.story.image.size).
      // We see its back, so the 3D phone starts there edge-on and turns round to face you.
      phone: { center: [630, 818], height: 190, rotation: [24, 90, -26] },
      // While the story is told the illustration floats in 3D: it bobs up and down by `height`
      // px every `seconds`, sways by `sway` degrees, and tilts towards the pointer by up to
      // `tilt` [x, y] degrees. It settles before the 3D phone lifts out, so the phones line up.
      float: { height: 12, seconds: 6.5, sway: 0.6, tilt: [5, 8], perspective: 1600 },
      beats: [
        { art: { x: 0.69, y: 0.54, h: 0.9, w: 0.5, ry: 0, rz: 0 } }, // Intro, at the top.
        { at: { el: ".story", span: [0.1, 0.24] }, art: { x: 0.71, y: 0.55, h: 0.86, w: 0.48, ry: -12, rz: -1.5 } },
        { at: { el: ".story", span: [0.32, 0.46] }, art: { x: 0.69, y: 0.53, h: 0.88, w: 0.49, ry: 10, rz: 1.5 } },
        // The last beat: straight on, so the 3D phone can start in his hand.
        { at: { el: ".story", span: [0.54, 0.66] }, art: { x: 0.69, y: 0.54, h: 0.9, w: 0.5, ry: 0, rz: 0 } },
      ],
      // The 3D phone appears in his hand...
      lift: { at: { el: ".story", span: [0.68, 0.73] } },
      // ...then turns to face you and comes forward into the hero's place, while the
      // illustration stays behind it and falls back into the page: `depth` is how small it gets.
      pickSmart: {
        at: { el: ".story", span: [0.76, 0.95] },
        art: { opacity: 0, depth: 0.55 },
      },
    },
    hero: {
      // The lens is switched off: the hero shows the plain screen.
      at: { el: ".hero", from: 0.6, to: 0.05 },
      place: { x: [0.45, 0.87], y: [0.08, 0.92] },
      rotation: [6, -16, 0],
      lens: 0,
      backdrop: 1,
      screen: "hero",
    },
    // Scrolling on: the lens closes, the hero text makes way, and the breakdown of the
    // Rs. 1,000 fills in row by row beside the phone (site.hero.breakdown).
    lensOff: { at: { el: ".hero", span: [0.1, 0.18] }, lens: 0 },
    breakdown: {
      at: { el: ".hero", span: [0.22, 0.78] },
      place: { x: [0.52, 0.88], y: [0.08, 0.92] },
      rotation: [4, -12, 0],
      copy: 0,
      breakdown: 1,
      ease: "none",
    },
    // Each feature's screen, beside its text. The first one reassembles the layers.
    projects: {
      at: { el: "#features", from: 1, to: 0.12 },
      next: { from: 0.8, to: 0.4 }, // For each later feature, measured on its own item.
      monitor: { rotation: [2, -12, 0] },
      place: { cols: [7, 12], y: [0.1, 0.9], zoom: 0.95 }, // A little room for the tilt.
      rotation: [4, -14, 0],
      gap: 0,
      labels: 0,
      backdrop: 0,
      // The hero (text and breakdown) scrolls away as it is: no fading back on the way out.
      copy: 0,
      breakdown: 1,
    },
    // No magic: the phone goes back to the Rs. 1,000 check, then zooms into each part of it.
    about: {
      at: { el: "#maths", from: 0.95, to: 0.35 },
      place: { cols: [8, 12], y: [0.12, 0.88] },
      rotation: [2, -10, 0],
      screen: "hero",
    },
    decisions: [
      { focus: FARE, at: { from: 0.8, to: 0.3 }, place: { cols: [7, 12], y: [0.12, 0.88] }, rotation: [0, -6, 0] },
      { focus: DISTANCE, at: { from: 0.8, to: 0.3 }, place: { cols: [7, 12], y: [0.12, 0.88] }, rotation: [0, -6, 0] },
      { focus: RESULT, at: { from: 0.8, to: 0.3 }, place: { cols: [7, 12], y: [0.12, 0.88] }, rotation: [0, -6, 0] },
    ],
    // While you ride: small and still at the side while the cards come in.
    stack: {
      at: { el: ".stack", from: 1.35, to: 0.5 },
      place: { cols: [10, 12], y: [0.2, 0.8], zoom: 0.9 },
      rotation: [4, -16, 0],
      screen: "hero",
    },
    // Privacy: Home, on the right, next to the promises.
    privacy: {
      at: { el: "#privacy", from: 0.9, to: 0.3 },
      place: { cols: [8, 12], y: [0.12, 0.88] },
      rotation: [3, -12, 0],
      screen: "project:3",
    },
    // Plans and the end of the page belong to the text and the dawn picture: the phone rises away.
    leave: {
      at: { el: "#plans", from: 0.85, to: 0.15 },
      place: { cols: [8, 12], y: [0.12, 0.88] },
      offset: [0, -0.85],
      rotation: [10, -18, 4],
      opacity: 0,
      ease: "power1.in",
      screen: "project:3",
    },
  },

  // Phones: the hero only, without the lens. The layers separate, come back together
  // and scroll away with the hero text. The rest of the page uses images and code panels.
  lite: {
    hero: {
      place: litePhone,
      rotation: [6, -10, 0],
      backdrop: 1,
      copy: 1,
      screen: "hero",
      // The story comes first on phones too: the phone arrives with the hero section.
      ride: ".hero",
    },
    // A slow turn while the hero text is read, instead of taking the screen apart.
    turn: {
      at: { el: ".hero", span: [0.1, 0.9] },
      place: litePhone,
      rotation: [2, 8, 0],
    },
    // Locked to the scrollbar, so it leaves exactly as fast as the hero text does.
    exit: { at: { el: "#features", from: 1, to: 0 }, offset: [0, -1], ease: "none", backdrop: 0, copy: 1 },
  },
};
