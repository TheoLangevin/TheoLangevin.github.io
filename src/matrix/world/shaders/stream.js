import { FOG, TIME } from './chunks.js'

/** Paths on the ground: a thin line with comets of light flowing towards each sector. */
export const streamVertex = /* glsl */ `
  attribute vec2 aPath;   // metres along the path, and -1..1 across it

  varying vec2 vPath;
  varying vec2 vGround;
  varying float vDepth;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 view = viewMatrix * world;
    vPath = aPath;
    vGround = world.xz;
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }
`

export const streamFragment = /* glsl */ `
  ${TIME}
  ${FOG}

  uniform vec3 uColor;
  uniform vec3 uPlayer;
  uniform float uReveal;

  varying vec2 vPath;
  varying vec2 vGround;
  varying float vDepth;

  void main() {
    float across = abs(vPath.y);
    float core = 1.0 - smoothstep(0.0, 0.16, across);
    float band = 1.0 - smoothstep(0.25, 1.0, across);

    // A comet every 14 metres: a sharp head with a long tail behind it.
    float phase = fract(vPath.x / 14.0 - uTime * 0.55);
    float comet = pow(phase, 7.0);
    float dashes = step(0.55, fract(vPath.x * 0.8 - uTime * 1.6));

    float near = exp(-dot(vGround - uPlayer.xz, vGround - uPlayer.xz) / 30.0);
    float drawn = smoothstep(0.0, 0.08, uReveal - length(vGround) / 130.0);

    vec3 color = uColor * (core * (0.3 + 2.2 * comet + 0.9 * near) + band * (0.05 + 0.5 * comet) * (0.5 + 0.5 * dashes));
    gl_FragColor = vec4(color * drawn * (1.0 - fogAmount(vDepth)), 1.0);
    #include <colorspace_fragment>
  }
`
