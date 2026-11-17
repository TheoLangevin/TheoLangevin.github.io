import { HASH, RAIN, TIME } from './chunks.js'

/** The edge of the world: a wall of code that only shows where the visitor gets close. */
export const firewallVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vUv = uv;
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const firewallFragment = /* glsl */ `
  ${TIME}
  ${HASH}
  ${RAIN}

  uniform vec3 uColor;
  uniform vec3 uHead;
  uniform vec3 uPlayer;
  uniform vec2 uGrid;

  varying vec2 vUv;
  varying vec3 vWorld;

  void main() {
    vec2 grid = vec2(vUv.x * uGrid.x, (1.0 - vUv.y) * uGrid.y);
    vec2 gradX = dFdx(grid);
    vec2 gradY = dFdy(grid);

    float near = 1.0 - smoothstep(4.0, 17.0, distance(vWorld.xz, uPlayer.xz));
    if (near < 0.004) discard;

    vec2 trail = rainTrail(grid, 7.7, uGrid.y, 9.0);
    float glyph = rainGlyph(grid, 7.7, gradX, gradY);
    vec2 inCell = abs(fract(grid) - 0.5);
    float lattice = smoothstep(0.44, 0.5, max(inCell.x, inCell.y));

    vec3 color = uColor * (glyph * (0.3 + trail.x) + lattice * 0.35) + uHead * glyph * trail.y;
    gl_FragColor = vec4(color * near * (1.0 - vUv.y * 0.85), 1.0);
    #include <colorspace_fragment>
  }
`
