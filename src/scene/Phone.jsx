import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { site } from "../../data/site.js";
import { story, W, H } from "../story.js";
import { lens } from "../lens.js";
import { createTextures, rgb, COLORS } from "./textures.js";
import { vertex, plateFragment, finalFragment, shadowFragment, solidFragment } from "./shaders.js";
import { scroll as config } from "../../data/scroll.js";

const deg = THREE.MathUtils.degToRad;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const RADIUS = site.hero.cornerRadius;
const SHADOW_PAD = 120;
const MONITOR = config.monitor;
const lerp = (a, b, t) => a + (b - a) * t;
const aspectOf = (t) => (t?.image?.width && t.image.height ? t.image.width / t.image.height : W / H);

// Back to front. Index 0 is drawn first.
const LAYERS = ["code", "wireframe", "components"];

function material(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

export function Phone() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const rig = useRef();
  const plates = useRef([]);
  const finalMesh = useRef();
  const shadowMesh = useRef();
  const bezelMesh = useRef();
  const neckMesh = useRef();
  const baseMesh = useRef();
  const dom = useRef(null);
  const shown = useRef(false);
  const v = useMemo(() => new THREE.Vector3(), []);

  const { tex, ready, dispose } = useMemo(() => createTextures(gl, () => invalidate()), [gl, invalidate]);

  const geometry = useMemo(() => new THREE.PlaneGeometry(W, H), []);
  const shadowGeometry = useMemo(() => new THREE.PlaneGeometry(W + SHADOW_PAD * 2, H + SHADOW_PAD * 2), []);
  const unitGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const materials = useMemo(() => {
    const size = new THREE.Vector2(W, H);
    const canvas = rgb(COLORS.canvas);
    const ink = rgb(COLORS.ink);
    const plate = (map, sheetAlpha) =>
      material(plateFragment, {
        map: { value: map },
        sheet: { value: new THREE.Vector4(canvas.x, canvas.y, canvas.z, sheetAlpha) },
        edge: { value: ink },
        edgeAlpha: { value: 0.22 },
        opacity: { value: 0 },
        size: { value: size },
        radius: { value: RADIUS },
      });
    const solid = (hex) =>
      material(solidFragment, {
        color: { value: rgb(hex) },
        size: { value: new THREE.Vector2(1, 1) },
        radius: { value: 0 },
        opacity: { value: 0 },
      });
    return {
      code: plate(tex.code, 0.94),
      wireframe: plate(tex.wireframe, 0.55),
      components: plate(tex.components, 0.55),
      shadow: material(shadowFragment, {
        size: { value: new THREE.Vector2(W + SHADOW_PAD * 2, H + SHADOW_PAD * 2) },
        rectHalf: { value: new THREE.Vector2(W / 2 - 40, H / 2 - 40) },
        radius: { value: RADIUS },
        blur: { value: 120 },
        alpha: { value: 0.32 },
        color: { value: rgb("#000000") },
      }),
      bezel: solid("#0b0f1e"),
      neck: solid("#c9d0de"),
      base: solid("#b6bfd2"),
      final: material(finalFragment, {
        aspects: { value: new THREE.Vector2(W / H, W / H) },
        mapA: { value: tex.final },
        mapB: { value: tex.final },
        wireMap: { value: tex.wireframe },
        codeMap: { value: tex.code },
        wipe: { value: 0 },
        mode: { value: 0 },
        tap: { value: new THREE.Vector3() },
        opacity: { value: 1 },
        size: { value: new THREE.Vector2(W, H) },
        radius: { value: RADIUS },
        lens: { value: new THREE.Vector3() },
        lensOn: { value: 0 },
        paper: { value: canvas },
        focusRect: { value: new THREE.Vector4() },
        focusOn: { value: 0 },
        ringHalf: { value: 3 },
        ringColor: { value: rgb(COLORS.amber) },
      }),
    };
  }, [tex]);

  useEffect(() => {
    let alive = true;
    ready.then(() => {
      shown.current = true;
      // The page opens on the whole screen as wireframe and code, then closes down to the lens.
      invalidate();
    });
    return () => {
      alive = false;
      dispose();
      story.phoneReady = false;
      dispatchEvent(new Event("phone-ready"));
      geometry.dispose();
      shadowGeometry.dispose();
      unitGeometry.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    };
  }, [ready, dispose, geometry, shadowGeometry, unitGeometry, materials, invalidate]);

  useFrame((state, delta) => {
    const f = story.frame;
    const group = rig.current;
    if (!f || !group) return;
    // Nothing until the screen has loaded: never a blank phone.
    // Nothing until the screen has loaded, and nothing while the story keeps it hidden.
    group.visible = shown.current && f.opacity > 0.001;
    if (!shown.current) return;
    if (!story.phoneReady) {
      story.phoneReady = true;
      dispatchEvent(new Event("phone-ready"));
    }
    const { width: w, height: h } = state.size;
    dom.current ??= {
      ring: lens.el,
      labels: ["final", "components", "wireframe", "code"].map((n) => document.querySelector(`[data-label="${n}"]`)),
      layer: document.querySelector(".scene__labels"),
    };

    // Camera: looking straight at the phone from 1.6 x the larger viewport side, the same
    // perspective the CSS version used. The view is shifted so the phone lands at (cx, cy).
    const cam = state.camera;
    const dist = Math.max(w, h) * 1.6;
    cam.position.set(0, 0, dist);
    cam.near = dist * 0.05;
    cam.far = dist * 4;
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / 2 / dist));
    cam.aspect = w / h;
    cam.setViewOffset(w, h, w / 2 - f.cx, h / 2 - f.cy, w, h);
    cam.updateProjectionMatrix();

    // CSS rotateX/Y/Z with y pointing down -> three.js with y up.
    group.scale.setScalar(f.s);
    group.rotation.set(-deg(f.rx), deg(f.ry), -deg(f.rz), "XYZ");

    // Final UI in front, code at the back.
    const z = (i) => (1.5 - i) * f.gap - i * 2;
    // Phone -> monitor: the screen widens, gains a bezel and a stand, and the whole thing
    // stays centred where the phone was.
    const dv = f.device;
    const sx = lerp(W, MONITOR.screen[0], dv);
    const sy = lerp(H, MONITOR.screen[1], dv);
    const bezel = MONITOR.bezel * dv;
    const neckH = MONITOR.neck[1] * dv;
    const baseH = MONITOR.base[1] * dv;
    const screenY = ((MONITOR.neck[1] + MONITOR.base[1]) / 2) * dv;
    const corner = lerp(RADIUS, MONITOR.corner, dv);
    const bottom = screenY - sy / 2 - bezel;

    finalMesh.current.position.set(0, screenY, z(0));
    finalMesh.current.scale.set(sx / W, sy / H, 1);
    materials.final.uniforms.size.value.set(sx, sy);
    materials.final.uniforms.radius.value = corner;

    shadowMesh.current.position.set(0, screenY - 60, z(0) - 1);
    shadowMesh.current.scale.set((sx + SHADOW_PAD * 2) / (W + SHADOW_PAD * 2), (sy + SHADOW_PAD * 2) / (H + SHADOW_PAD * 2), 1);
    materials.shadow.uniforms.size.value.set(sx + SHADOW_PAD * 2, sy + SHADOW_PAD * 2);
    materials.shadow.uniforms.rectHalf.value.set(sx / 2 - 40, sy / 2 - 40);
    materials.shadow.uniforms.radius.value = corner;

    const place = (mesh, mat, w2, h2, y, r) => {
      mesh.visible = dv > 0.001;
      mesh.position.set(0, y, z(0) - 0.5);
      mesh.scale.set(Math.max(w2, 1), Math.max(h2, 1), 1);
      mat.uniforms.size.value.set(Math.max(w2, 1), Math.max(h2, 1));
      mat.uniforms.radius.value = r;
      mat.uniforms.opacity.value = clamp(dv * 1.5) * f.opacity;
    };
    place(bezelMesh.current, materials.bezel, sx + bezel * 2, sy + bezel * 2, screenY, corner + bezel);
    place(neckMesh.current, materials.neck, MONITOR.neck[0] * dv, neckH, bottom - neckH / 2, 0);
    place(baseMesh.current, materials.base, MONITOR.base[0] * dv, baseH, bottom - neckH - baseH / 2, baseH / 2);
    LAYERS.forEach((name, j) => {
      const mesh = plates.current[j];
      const i = 3 - j;
      mesh.position.z = z(i);
      mesh.visible = f.layers > 0.001;
      mesh.material.uniforms.opacity.value = f.layers * f.opacity;
    });
    materials.code.uniforms.map.value = tex.code;
    materials.wireframe.uniforms.map.value = tex.wireframe;
    materials.components.uniforms.map.value = tex.components;

    const u = materials.final.uniforms;
    u.mapA.value = tex.screens[f.screenA] ?? tex.final;
    u.mapB.value = tex.screens[f.screenB] ?? tex.final;
    u.aspects.value.set(aspectOf(u.mapA.value), aspectOf(u.mapB.value));
    u.wipe.value = f.wipe;
    // fade: only what differs changes. tab-left / tab-right: a bottom-bar tab, sliding from
    // its side. push: a new screen over the old one, from the right. up: the old wipe.
    u.mode.value = { fade: 0, "tab-left": 1, "tab-right": 2, push: 3, up: 4 }[f.transition] ?? 0;
    if (f.tap) u.tap.value.set(f.tap[0], f.tap[1], 1);
    else u.tap.value.z = 0;
    u.opacity.value = f.opacity;
    materials.shadow.uniforms.alpha.value = 0.32 * f.opacity;
    u.wireMap.value = tex.wireframe;
    u.codeMap.value = tex.code;

    u.focusOn.value = f.highlight;
    if (f.focus) {
      const pad = 10;
      u.focusRect.value.set(f.focus.x - pad, f.focus.y - pad, f.focus.x + f.focus.w + pad, f.focus.y + f.focus.h + pad);
    }
    u.ringHalf.value = 1.25 / Math.max(f.s, 0.05);

    group.updateMatrixWorld(true);

    /* Lens */
    const lensOn = story.mode === "full" ? f.lens : 0;
    let busy = false;
    if (lensOn > 0.001) {
      if (!lens.moved) {
        // Rest over the result until someone moves it (site.hero.lensRest, in screen pixels).
        const [rx, ry] = site.hero.lensRest ?? [W / 2, 520];
        v.set(rx - W / 2, H / 2 - ry, z(0)).applyMatrix4(group.matrixWorld).project(cam);
        lens.tx = ((v.x + 1) / 2) * w;
        lens.ty = ((1 - v.y) / 2) * h;
        if (!lens.parked) {
          lens.x = lens.tx;
          lens.y = lens.ty;
          lens.parked = true;
        }
      }
      const follow = lens.dragging ? 1 : 1 - Math.pow(0.8, Math.min(delta, 0.1) * 60);
      lens.x += (lens.tx - lens.x) * follow;
      lens.y += (lens.ty - lens.y) * follow;
      if (Math.abs(lens.tx - lens.x) + Math.abs(lens.ty - lens.y) > 0.3) busy = true;

      // The lens opens with the scroll as the hero arrives, and closes the same way.
      const r = clamp(h * 0.15, 96, 150) * lensOn;
      lens.r = r;
      const dpr = state.gl.getPixelRatio();
      u.lens.value.set(lens.x * dpr, (h - lens.y) * dpr, r * dpr);
      u.lensOn.value = 1;
      const ring = dom.current.ring;
      ring.style.setProperty("--lens-r", `${r.toFixed(1)}px`);
      ring.style.transform = `translate(${(lens.x - r).toFixed(1)}px, ${(lens.y - r).toFixed(1)}px)`;
      ring.toggleAttribute("data-off", r < 2 || lensOn < 0.05);
    } else {
      u.lensOn.value = 0;
      dom.current.ring.toggleAttribute("data-off", true);
    }

    /* Layer names, beside each plate, in HTML */
    const labelsOn = f.labels > 0.01;
    dom.current.layer.style.opacity = f.labels.toFixed(3);
    dom.current.layer.style.visibility = labelsOn ? "visible" : "hidden";
    if (labelsOn) {
      const off = story.labelPx / f.s;
      dom.current.labels.forEach((el, i) => {
        v.set(-W / 2 - off, H / 2, z(i)).applyMatrix4(group.matrixWorld).project(cam);
        const x = ((v.x + 1) / 2) * w;
        const y = ((1 - v.y) / 2) * h;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateX(-100%)`;
      });
    }

    if (busy) invalidate();
  });

  return (
    <group ref={rig}>
      {LAYERS.map((name, j) => (
        <mesh key={name} ref={(m) => (plates.current[j] = m)} geometry={geometry} material={materials[name]} renderOrder={j} />
      ))}
      <mesh ref={shadowMesh} geometry={shadowGeometry} material={materials.shadow} renderOrder={3} />
      <mesh ref={baseMesh} geometry={unitGeometry} material={materials.base} renderOrder={4} />
      <mesh ref={neckMesh} geometry={unitGeometry} material={materials.neck} renderOrder={5} />
      <mesh ref={bezelMesh} geometry={unitGeometry} material={materials.bezel} renderOrder={6} />
      <mesh ref={finalMesh} geometry={geometry} material={materials.final} renderOrder={7} />
    </group>
  );
}
