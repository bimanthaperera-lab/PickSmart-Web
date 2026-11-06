import * as THREE from "three";
import { site } from "../../data/site.js";
import { W, H } from "../story.js";

// The page colours (styles.css): the near-black page, its text, and the brand yellow.
export const COLORS = {
  canvas: "#0b0f14",
  ink: "#f2f4f7",
  amber: "#fbbb23",
};

// Raw 0–1 sRGB values, to match CSS (three's Color would convert to linear).
export const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

function blank() {
  const t = new THREE.DataTexture(new Uint8Array([11, 15, 20, 0]), 1, 1);
  t.needsUpdate = true;
  return t;
}

// Every texture the phone uses, loaded once. Missing ones stay transparent until they arrive.
export function createTextures(gl, onChange) {
  const loader = new THREE.TextureLoader();
  const empty = blank();
  const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const prep = (t) => {
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = aniso;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };

  const byUrl = new Map();
  const load = (url) => {
    if (!byUrl.has(url)) {
      byUrl.set(
        url,
        new Promise((resolve) => loader.load(url, (t) => resolve(prep(t)), undefined, () => resolve(null))),
      );
    }
    return byUrl.get(url);
  };

  const tex = { final: empty, components: empty, wireframe: empty, code: empty, screens: {}, empty };
  const set = (name, t) => {
    if (t) tex[name] = t;
    onChange();
  };

  const finalUrl = site.hero.layers.final.src;
  const ready = Promise.all([
    load(finalUrl).then((t) => set("final", t)),
    load(site.hero.layers.wireframe).then((t) => set("wireframe", t)),
    codeTexture().then((t) => set("code", prep(t))),
  ]);
  load(site.hero.layers.components).then((t) => set("components", t));

  tex.screens.hero = load(finalUrl);
  site.projects.forEach((p, i) => {
    const url = p.screen ?? finalUrl;
    tex.screens[`project:${i}`] = load(url);
  });
  for (const [id, promise] of Object.entries(tex.screens)) {
    tex.screens[id] = empty;
    promise.then((t) => {
      if (t) tex.screens[id] = t;
      onChange();
    });
  }

  const dispose = () => {
    byUrl.forEach((p) => p.then((t) => t?.dispose()));
    tex.code.dispose();
    empty.dispose();
  };
  return { tex, ready, dispose };
}

// The maths layer, drawn from site.hero.code: each block over the part of the screen it explains.
async function codeTexture() {
  try {
    await document.fonts.load('34px "Iosevka"');
  } catch {}
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.font = '34px "Iosevka", ui-monospace, "Cascadia Mono", Consolas, monospace';
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const lineHeight = 46;
  for (const block of site.hero.code) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(block.x, block.y, block.w, block.h);
    ctx.clip();
    const lines = block.text.split("\n");
    let y = block.y + block.h / 2 - ((lines.length - 1) * lineHeight) / 2;
    for (const line of lines) {
      // A halo in the page colour keeps code readable where it crosses wireframe lines.
      ctx.lineWidth = 8;
      ctx.strokeStyle = COLORS.canvas;
      ctx.strokeText(line, block.x + 28, y);
      ctx.fillStyle = block.accent ? COLORS.amber : COLORS.ink;
      ctx.fillText(line, block.x + 28, y);
      y += lineHeight;
    }
    ctx.restore();
  }
  return new THREE.CanvasTexture(canvas);
}
