import { FOG, HASH, RAIN, TIME } from './chunks.js'

/**
 * Code rain in 3D: thousands of glyphs drawn by a few hundred instanced quads.
 * A quad is either a single strip that turns to face the camera, or a wide
 * "curtain" with a fixed orientation.
 */
export const rainVertex = /* glsl */ `
  ${FOG}

  attribute vec3 aBase;    // foot of the strip
  attribute vec4 aShape;   // columns, rows, cell size, seed
  attribute vec2 aMotion;  // rows per second, yaw (below -50: face the camera)

  uniform float uReveal;

  varying vec2 vGrid;
  varying vec4 vInfo;      // seed, rows, speed, fade

  const float CELL_ASPECT = 1.12;

  void main() {
    float columns = aShape.x;
    float rows = aShape.y;
    float cell = aShape.z;

    vec3 right;
    if (aMotion.y < -50.0) {
      vec2 toCamera = cameraPosition.xz - aBase.xz;
      toCamera /= max(length(toCamera), 0.0001);
      right = vec3(toCamera.y, 0.0, -toCamera.x);
    } else {
      right = vec3(cos(aMotion.y), 0.0, -sin(aMotion.y));
    }

    vec3 world = aBase + right * (position.x * columns * cell);
    world.y += (position.y + 0.5) * rows * cell * CELL_ASPECT;

    vec4 view = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * view;

    vGrid = vec2(uv.x * columns, (1.0 - uv.y) * rows);

    // Strips fade out right next to the camera (so they never slap the lens),
    // in the fog, and until the arrival has reached them.
    float away = length(cameraPosition.xz - aBase.xz);
    float fade = smoothstep(1.5, 5.5, away) * (1.0 - fogAmount(-view.z));
    fade *= smoothstep(0.0, 0.25, uReveal - length(aBase.xz) / 190.0);
    vInfo = vec4(aShape.w, rows, aMotion.x, fade);
  }
`

export const rainFragment = /* glsl */ `
  ${TIME}
  ${HASH}
  ${RAIN}

  uniform vec3 uColor;
  uniform vec3 uHead;

  varying vec2 vGrid;
  varying vec4 vInfo;

  void main() {
    vec2 gradX = dFdx(vGrid);
    vec2 gradY = dFdy(vGrid);

    vec2 trail = rainTrail(vGrid, vInfo.x, vInfo.y, vInfo.z);
    float lit = max(trail.x, trail.y) * vInfo.w;
    if (lit < 0.004) discard;

    float glyph = rainGlyph(vGrid, vInfo.x, gradX, gradY);
    vec3 color = mix(uColor * (0.18 + 1.25 * trail.x * trail.x), uHead, trail.y);

    gl_FragColor = vec4(color * glyph * lit, 1.0);
    #include <colorspace_fragment>
  }
`
