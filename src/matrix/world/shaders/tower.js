import { FOG, HASH, RAIN, TIME } from './chunks.js'

/**
 * Distant "data towers": instanced boxes whose walls stream code, outlined by
 * glowing edges computed in the shader (no line geometry needed).
 */
export const towerVertex = /* glsl */ `
  varying vec2 vFace;    // position on the face, in metres
  varying vec2 vSize;    // size of the face, in metres
  varying float vSeed;
  varying float vWall;   // 1 on walls, 0 on the roof and underside
  varying float vDepth;

  void main() {
    vec3 scale = vec3(
      length(instanceMatrix[0].xyz),
      length(instanceMatrix[1].xyz),
      length(instanceMatrix[2].xyz)
    );
    vec3 facing = abs(normal);
    vSize = facing.y > 0.5 ? scale.xz : (facing.x > 0.5 ? scale.zy : scale.xy);
    vFace = uv * vSize;
    vWall = 1.0 - step(0.5, facing.y);
    vSeed = fract(instanceMatrix[3].x * 0.173 + instanceMatrix[3].z * 0.091) * 50.0 + normal.x * 3.0 + normal.z * 7.0;

    vec4 view = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }
`

export const towerFragment = /* glsl */ `
  ${TIME}
  ${HASH}
  ${FOG}
  ${RAIN}

  uniform vec3 uColor;
  uniform vec3 uHead;
  uniform vec3 uBase;
  uniform float uReveal;

  varying vec2 vFace;
  varying vec2 vSize;
  varying float vSeed;
  varying float vWall;
  varying float vDepth;

  const float CELL = 1.7;
  const float CELL_ASPECT = 1.12;

  void main() {
    vec2 grid = vec2(vFace.x / CELL, (vSize.y - vFace.y) / (CELL * CELL_ASPECT));
    vec2 gradX = dFdx(grid);
    vec2 gradY = dFdy(grid);

    vec2 toEdge = min(vFace, vSize - vFace);
    float edge = 1.0 - smoothstep(0.0, 0.3 + vDepth * 0.003, min(toEdge.x, toEdge.y));

    vec3 color = uBase;
    if (vWall > 0.5) {
      vec2 trail = rainTrail(grid, vSeed, vSize.y / (CELL * CELL_ASPECT), 4.0);
      float glyph = rainGlyph(grid, vSeed, gradX, gradY);
      color += uColor * glyph * (0.05 + trail.x * trail.x * 0.75) + uHead * glyph * trail.y * 0.7;
    }
    color += uColor * edge * 0.85;

    // Meant to be seen from far away: thinner fog than the rest of the world.
    color *= (1.0 - fogAmount(vDepth * 0.5)) * uReveal;

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`
