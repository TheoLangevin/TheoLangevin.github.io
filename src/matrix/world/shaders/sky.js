import { HASH, RAIN, TIME } from './chunks.js'

/** The horizon: a huge cylinder around the visitor, covered in distant code rain. */
export const skyVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const skyFragment = /* glsl */ `
  ${TIME}
  ${HASH}
  ${RAIN}

  uniform vec3 uColor;
  uniform vec3 uHead;
  uniform vec2 uGrid;        // columns, rows
  uniform float uIntensity;

  varying vec2 vUv;

  void main() {
    vec2 grid = vec2(vUv.x * uGrid.x, (1.0 - vUv.y) * uGrid.y);
    vec2 trail = rainTrail(grid, 3.7, uGrid.y, 4.5);
    float glyph = rainGlyph(grid, 3.7, dFdx(grid), dFdy(grid));

    // Never fully empty: a faint field of glyphs sits behind the falling ones.
    vec3 color = uColor * glyph * (0.045 + trail.x * trail.x * 0.85) + uHead * glyph * trail.y * 0.55;
    float fade = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));

    gl_FragColor = vec4(color * fade * uIntensity, 1.0);
    #include <colorspace_fragment>
  }
`
