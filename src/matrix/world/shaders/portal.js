import { HASH, RAIN, TIME } from './chunks.js'

/** The inside of a portal: rings of glyphs spiralling into a bright core. */
export const portalVertex = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const portalFragment = /* glsl */ `
  ${TIME}
  ${HASH}
  ${RAIN}

  uniform vec3 uColor;
  uniform vec3 uHead;
  uniform float uIntensity;
  uniform float uSeed;

  varying vec2 vUv;

  const float TAU = 6.28318530718;
  const float SPOKES = 44.0;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float angle = atan(p.y, p.x) / TAU + 0.5;

    // Polar grid of glyphs, turning and flowing towards the centre.
    vec2 grid = vec2(fract(angle + uTime * 0.03 + r * 0.35) * SPOKES, r * 12.0 + uTime * 2.4);
    vec2 gradX = vec2(0.0, dFdx(grid.y));
    vec2 gradY = vec2(0.0, dFdy(grid.y));
    gradX.x = dFdx(angle) * SPOKES;
    gradY.x = dFdy(angle) * SPOKES;
    float glyph = rainGlyph(grid, uSeed, gradX, gradY);
    vec2 trail = rainTrail(grid.yx, uSeed, SPOKES, 9.0);

    float swirl = 0.5 + 0.5 * sin(angle * TAU * 3.0 - r * 9.0 + uTime * 2.2);
    float core = exp(-r * r * 9.0) * (0.75 + 0.25 * sin(uTime * 3.0));
    float rim = smoothstep(0.82, 1.0, r);

    vec3 color = uColor * glyph * (0.08 + 0.45 * swirl) * (1.0 - r * 0.6);
    color += uHead * core * 0.45 + uColor * rim * 0.35 + uHead * glyph * trail.y * 0.25;
    gl_FragColor = vec4(color * uIntensity, 1.0);
    #include <colorspace_fragment>
  }
`
