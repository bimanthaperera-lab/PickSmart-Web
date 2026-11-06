import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { Phone } from "./Phone.jsx";
import { story } from "../story.js";

// The one canvas for the whole page. It only draws when something changed
// (scroll, lens, a texture arriving), so a still page costs nothing.
export function mountScene(host, { onLost }) {
  const root = createRoot(host);
  root.render(
    <Canvas
      frameloop="demand"
      dpr={story.mode === "lite" ? [1, 1.5] : [1, 2]}
      flat
      linear
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 30, near: 1, far: 100000, position: [0, 0, 2000] }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={({ gl, invalidate }) => {
        gl.setClearColor(0x000000, 0);
        story.invalidate = invalidate;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        });
        invalidate();
      }}
    >
      <Phone />
    </Canvas>,
  );
  return () => {
    story.invalidate = () => {};
    root.unmount();
  };
}
