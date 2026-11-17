import { AdditiveBlending, Color, DoubleSide, LineBasicMaterial, MeshBasicMaterial, ShaderMaterial } from 'three'
import { PALETTE } from '../palette.js'
import { shared } from '../shared.js'
import { FOG } from '../shaders/chunks.js'

/** Dark, matte body of every structure: it hides what stands behind it. */
export const BODY = new MeshBasicMaterial({
  color: PALETTE.dark,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
})

/** Glowing edges. Keep the base colour in userData so the glow can be scaled each frame. */
export function lineMaterial(color) {
  const material = new LineBasicMaterial({ color: color.clone(), toneMapped: false, transparent: true })
  material.userData.base = color.clone()
  return material
}

/** Solid light (a core, a ring): not affected by the screen's tone mapping, so it can glow. */
export function lightMaterial(color, { additive = false, opacity = 1 } = {}) {
  const material = new MeshBasicMaterial({
    color: color.clone(),
    toneMapped: false,
    transparent: additive || opacity < 1,
    opacity,
    depthWrite: !additive,
  })
  if (additive) {
    material.blending = AdditiveBlending
    material.side = DoubleSide
  }
  material.userData.base = color.clone()
  return material
}

/** Sets a material's colour to its base colour times `amount`. */
export function setGlow(material, amount) {
  material.color.copy(material.userData.base).multiplyScalar(amount)
}

/** A cone of light rising from a projector: brightest at its source, fading upwards. */
export function beamMaterial(color) {
  return new ShaderMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uColor: { value: new Color().copy(color) }, uIntensity: { value: 1 }, uTime: shared.uTime },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float rise = pow(1.0 - vUv.y, 1.6);
        float streaks = 0.65 + 0.35 * sin(vUv.x * 62.83 + uTime * 1.5) * sin(vUv.y * 9.0 - uTime * 3.0);
        gl_FragColor = vec4(uColor * rise * streaks * 0.35 * uIntensity, 1.0);
      }
    `,
  })
}

/** A field of horizontal scan lines, for the gates: crossing one "scans" the visitor. */
export function scannerMaterial(color) {
  return new ShaderMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uColor: { value: new Color().copy(color) },
      uIntensity: { value: 1 },
      uTime: shared.uTime,
      uFogDensity: shared.uFogDensity,
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vDepth = -view.z;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        float lines = smoothstep(0.82, 1.0, sin(vUv.y * 160.0 - uTime * 4.0));
        float sweep = exp(-pow(fract(uTime * 0.35) - vUv.y, 2.0) * 220.0);
        float sides = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        float fade = (0.25 + 0.75 * vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
        vec3 color = uColor * (lines * 0.12 + sweep * 0.5) * sides * fade * uIntensity;
        gl_FragColor = vec4(color * (1.0 - fogAmount(vDepth)), 1.0);
      }
    `,
  })
}
