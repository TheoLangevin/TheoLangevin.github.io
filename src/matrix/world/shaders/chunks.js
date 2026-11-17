/** GLSL shared by the shaders of the world. */

export const TIME = /* glsl */ `
  uniform float uTime;
`

/** Hash without sine: stable across GPUs. Returns a value in [0, 1). */
export const HASH = /* glsl */ `
  float hash21(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
`

/** Same curve as three.js' FogExp2, so custom and built-in materials agree. */
export const FOG = /* glsl */ `
  uniform float uFogDensity;

  float fogAmount(float depth) {
    return 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
  }
`

/**
 * The "digital rain". A surface is seen as a grid of cells (x: column, y: row,
 * growing downwards); in each column a bright head falls and leaves a fading
 * trail, and every cell shows a glyph from the atlas that changes now and then.
 * Needs TIME and HASH.
 */
export const RAIN = /* glsl */ `
  uniform sampler2D uAtlas;

  const float ATLAS_COLUMNS = 8.0;
  const float GLYPH_COUNT = 64.0;

  // x: light left by the trail (1 just behind the head, 0 at its end). y: 1 on the head.
  vec2 rainTrail(vec2 grid, float seed, float rows, float speed) {
    float column = floor(grid.x);
    float row = floor(grid.y);
    float a = hash21(vec2(column, seed));
    float b = hash21(vec2(seed + 7.31, column));
    float tail = rows * (0.3 + 0.5 * b);
    // One loop: cross the surface, let the tail leave, then wait a little.
    float cycle = rows + tail + rows * (0.1 + 0.9 * a);
    float head = mod(uTime * speed * (0.5 + a) + a * 131.0, cycle);
    float behind = head - row;
    float lit = step(0.0, behind) * (1.0 - smoothstep(0.0, tail, behind));
    float isHead = step(0.0, behind) * (1.0 - step(1.0, behind));
    return vec2(lit, isHead);
  }

  // The glyph drawn in the cell (0 or 1, softened). The gradients say how fast
  // "grid" changes per pixel, to pick the right mip level without seams.
  float rainGlyph(vec2 grid, float seed, vec2 gradX, vec2 gradY) {
    vec2 cell = floor(grid);
    vec2 inside = fract(grid);
    float rate = 0.4 + 2.6 * hash21(cell + seed);
    float tick = floor(uTime * rate + 20.0 * hash21(cell.yx - seed));
    float index = floor(hash21(cell * 1.31 + vec2(tick * 0.618, seed)) * GLYPH_COUNT);
    vec2 atlasCell = vec2(mod(index, ATLAS_COLUMNS), floor(index / ATLAS_COLUMNS));
    vec2 uv = (atlasCell + vec2(inside.x, 1.0 - inside.y)) / ATLAS_COLUMNS;
    return textureGrad(uAtlas, uv, gradX / ATLAS_COLUMNS, gradY / ATLAS_COLUMNS).r;
  }
`
