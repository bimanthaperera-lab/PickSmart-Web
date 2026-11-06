// Every layer is a flat plane in the app screen's own pixel space (898 x 2000 units).
// Colours go in and out untouched (no colour management), so they match the CSS.

const roundedRect = /* glsl */ `
  float sdRoundRect(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - halfSize + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
`;

export const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Components, wireframe and code: an image over a translucent sheet with a thin edge.
export const plateFragment = /* glsl */ `
  uniform sampler2D map;
  uniform vec4 sheet;
  uniform vec3 edge;
  uniform float edgeAlpha;
  uniform float opacity;
  uniform vec2 size;
  uniform float radius;
  varying vec2 vUv;
  ${roundedRect}
  void main() {
    vec2 p = (vUv - 0.5) * size;
    float d = sdRoundRect(p, size * 0.5, radius);
    float aa = fwidth(d);
    float inside = 1.0 - smoothstep(-aa, aa, d);

    vec4 t = texture2D(map, vUv);
    float a = t.a + sheet.a * (1.0 - t.a);
    vec3 c = (t.rgb * t.a + sheet.rgb * sheet.a * (1.0 - t.a)) / max(a, 1e-4);

    float ring = (1.0 - smoothstep(3.0 - aa, 3.0 + aa, -d)) * edgeAlpha;
    float outA = ring + a * (1.0 - ring);
    vec3 outC = (edge * ring + c * a * (1.0 - ring)) / max(outA, 1e-4);

    gl_FragColor = vec4(outC, outA * inside * opacity);
  }
`;

// Fill the plate with an image of another shape, cropping it, keeping its top edge.
const cover = /* glsl */ `
  vec2 cover(vec2 uv, float imageAspect) {
    float plateAspect = size.x / size.y;
    if (plateAspect > imageAspect) return vec2(uv.x, 1.0 - (1.0 - uv.y) * imageAspect / plateAspect);
    return vec2(0.5 + (uv.x - 0.5) * plateAspect / imageAspect, uv.y);
  }
`;

// The finished screen. It also draws the lens (wireframe + code inside a circle on screen),
// the wipe from one project's screen to the next, and the outline around a focus area.
export const finalFragment = /* glsl */ `
  uniform sampler2D mapA;
  uniform sampler2D mapB;
  uniform sampler2D wireMap;
  uniform sampler2D codeMap;
  uniform float wipe;
  uniform float mode;      // 0 fade, 1 tab from the right, 2 tab from the left, 3 push, 4 up
  uniform vec3 tap;        // x, y in screen pixels from the top left; z = 1 to show a tap
  uniform float opacity;
  uniform vec2 aspects;    // width / height of mapA and mapB
  uniform vec2 size;
  uniform float radius;
  uniform vec3 lens;       // x, y, r in drawing-buffer pixels
  uniform float lensOn;
  uniform vec3 paper;
  uniform vec4 focusRect;  // x0, y0, x1, y1 in screen pixels, from the top left
  uniform float focusOn;
  uniform float ringHalf;  // half the outline width, in screen pixels
  uniform vec3 ringColor;
  varying vec2 vUv;
  ${roundedRect}
  ${cover}
  void main() {
    vec2 p = (vUv - 0.5) * size;
    float d = sdRoundRect(p, size * 0.5, radius);
    float aa = fwidth(d);
    float inside = 1.0 - smoothstep(-aa, aa, d);

    float y = 1.0 - vUv.y;
    // With a tap, the finger presses first and the screen changes after it.
    float t = tap.z > 0.5 ? smoothstep(0.32, 1.0, wipe) : wipe;
    t = t * t * (3.0 - 2.0 * t);
    vec3 a = texture2D(mapA, cover(vUv, aspects.x)).rgb;
    vec3 b = texture2D(mapB, cover(vUv, aspects.y)).rgb;
    vec3 c;
    if (mode < 0.5) {
      // Same layout, new numbers: a plain cross-fade only shows what differs.
      c = mix(a, b, t);
    } else if (mode < 2.5) {
      // A tab: both screens move together, the new one from the side its tab is on.
      float dir = mode < 1.5 ? 1.0 : -1.0;
      float x = vUv.x + dir * t;
      bool inB = dir > 0.0 ? x > 1.0 : x < 0.0;
      vec2 uv = vec2(inB ? x - dir : x, vUv.y);
      c = inB ? texture2D(mapB, cover(uv, aspects.y)).rgb : texture2D(mapA, cover(uv, aspects.x)).rgb;
    } else if (mode < 3.5) {
      // Push: the new screen slides in over the old one, which drifts back and darkens.
      float edge = 1.0 - t;
      if (vUv.x >= edge) {
        c = texture2D(mapB, cover(vec2(vUv.x - edge, vUv.y), aspects.y)).rgb;
      } else {
        c = texture2D(mapA, cover(vec2(vUv.x + t * 0.3, vUv.y), aspects.x)).rgb * (1.0 - 0.55 * t);
        c *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.06, edge - vUv.x)) * step(0.001, t);
      }
    } else {
      float edgeAt = 1.0 - (t * 1.1 - 0.05);
      c = mix(a, b, smoothstep(edgeAt - 0.035, edgeAt + 0.035, y));
    }

    // The finger: a soft disc that presses down, then lets go as the screen changes.
    if (tap.z > 0.5) {
      float press = smoothstep(0.0, 0.14, wipe) * (1.0 - smoothstep(0.34, 0.5, wipe));
      float grow = mix(0.7, 1.0, smoothstep(0.0, 0.2, wipe));
      vec2 px = vec2(vUv.x, y) * size;
      float r = 46.0 * grow;
      float dist = length(px - tap.xy);
      float faa = fwidth(dist);
      float disc = 1.0 - smoothstep(r - faa, r + faa, dist);
      float ring = 1.0 - smoothstep(2.5 - faa, 2.5 + faa, abs(dist - r));
      float ripple = smoothstep(0.24, 0.5, wipe) * (1.0 - smoothstep(0.42, 0.62, wipe));
      float wave = 1.0 - smoothstep(2.0, 4.0, abs(dist - r * (1.0 + 1.4 * smoothstep(0.24, 0.62, wipe))));
      c = mix(c, vec3(1.0), disc * 0.32 * press + ring * 0.7 * press + wave * 0.5 * ripple);
    }

    if (focusOn > 0.001) {
      vec2 px = vec2(vUv.x, y) * size;
      vec2 center = (focusRect.xy + focusRect.zw) * 0.5;
      vec2 halfSize = (focusRect.zw - focusRect.xy) * 0.5;
      float fd = sdRoundRect(px - center, halfSize, 30.0);
      float faa = fwidth(fd);
      float outside = smoothstep(-faa, faa, fd);
      c = mix(c, c * 0.34, outside * focusOn);
      float ring = 1.0 - smoothstep(ringHalf - faa, ringHalf + faa, abs(fd - ringHalf));
      c = mix(c, ringColor, ring * focusOn);
    }

    if (lensOn > 0.001) {
      float ld = distance(gl_FragCoord.xy, lens.xy);
      float lm = (1.0 - smoothstep(lens.z - 1.0, lens.z + 1.0, ld)) * lensOn;
      if (lm > 0.0) {
        vec4 w = texture2D(wireMap, vUv);
        vec4 k = texture2D(codeMap, vUv);
        vec3 lc = mix(paper, w.rgb, w.a);
        lc = mix(lc, k.rgb, k.a);
        c = mix(c, lc, lm);
      }
    }

    gl_FragColor = vec4(c, inside * opacity);
  }
`;

// A flat rounded shape: the monitor's bezel, neck and foot.
export const solidFragment = /* glsl */ `
  uniform vec3 color;
  uniform vec2 size;
  uniform float radius;
  uniform float opacity;
  varying vec2 vUv;
  ${roundedRect}
  void main() {
    vec2 p = (vUv - 0.5) * size;
    float d = sdRoundRect(p, size * 0.5, radius);
    float aa = fwidth(d);
    gl_FragColor = vec4(color, (1.0 - smoothstep(-aa, aa, d)) * opacity);
  }
`;

// A soft shadow under the finished screen, like CSS box-shadow: 0 60px 120px -40px.
export const shadowFragment = /* glsl */ `
  uniform vec2 size;
  uniform vec2 rectHalf;
  uniform float radius;
  uniform float blur;
  uniform float alpha;
  uniform vec3 color;
  varying vec2 vUv;
  ${roundedRect}
  void main() {
    vec2 p = (vUv - 0.5) * size;
    float d = sdRoundRect(p, rectHalf, radius);
    float a = 1.0 - smoothstep(-blur, blur, d);
    gl_FragColor = vec4(color, a * a * alpha);
  }
`;
