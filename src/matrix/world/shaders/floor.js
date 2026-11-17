import { FOG, HASH, TIME } from './chunks.js'

export const SPOT_COUNT = 16

/**
 * The ground: a dark grid that lights up around the visitor, under every node
 * and along a pulse that keeps radiating from the plaza.
 */
export const floorVertex = /* glsl */ `
  varying vec3 vWorld;
  varying float vDepth;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 view = viewMatrix * world;
    vWorld = world.xyz;
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }
`

export const floorFragment = /* glsl */ `
  #define SPOTS ${SPOT_COUNT}
  ${TIME}
  ${HASH}
  ${FOG}

  uniform vec3 uPlayer;
  uniform vec3 uStep;                // x, z and time of the last footstep
  uniform float uReveal;
  uniform float uRadius;
  uniform vec3 uColor;
  uniform vec4 uSpots[SPOTS];        // x, z, radius, intensity
  uniform vec3 uSpotColors[SPOTS];

  varying vec3 vWorld;
  varying float vDepth;

  // Anti-aliased grid lines every "size" metres.
  float gridLines(vec2 p, float size, float width) {
    vec2 cell = p / size;
    vec2 line = abs(fract(cell - 0.5) - 0.5) / fwidth(cell);
    return 1.0 - min(min(line.x, line.y) / width, 1.0);
  }

  void main() {
    vec2 p = vWorld.xz;
    float fromCentre = length(p);
    float fromPlayer = length(p - uPlayer.xz);

    float lines = gridLines(p, 1.0, 1.0) * 0.32 + gridLines(p, 5.0, 1.5) * 0.9;

    // What lights the grid: the visitor, a slow pulse, and their last step.
    float near = exp(-fromPlayer * fromPlayer / 42.0);
    float pulseRadius = mod(uTime, 9.0) * 12.0;
    float pulse = exp(-pow(fromCentre - pulseRadius, 2.0) / 4.0) * (1.0 - pulseRadius / 108.0);
    float stepAge = uTime - uStep.z;
    float ripple = exp(-pow(length(p - uStep.xy) - stepAge * 7.0, 2.0) * 1.6) * exp(-stepAge * 2.4);

    vec3 color = uColor * lines * (0.075 + near * 0.6 + pulse * 0.85 + ripple * 1.1);
    color += uColor * near * 0.012;

    // Pools of light under the nodes.
    for (int i = 0; i < SPOTS; i++) {
      vec4 spot = uSpots[i];
      float d = length(p - spot.xy);
      float glow = exp(-d * d / (spot.z * spot.z)) * spot.w;
      color += uSpotColors[i] * glow * (lines * 1.3 + 0.045);
    }

    // A few tiles blink at random, like activity on a board.
    vec2 tile = floor(p);
    vec2 inTile = abs(fract(p) - 0.5);
    float blink = step(0.9975, hash21(tile + floor(uTime * 2.0) * 0.37));
    color += uColor * blink * 0.22 * step(max(inTile.x, inTile.y), 0.42);

    // Arrival: the grid draws itself outwards from the plaza, led by a bright front.
    float front = uReveal * (uRadius + 70.0);
    float drawn = 1.0 - smoothstep(front - 5.0, front, fromCentre);
    float edge = exp(-pow(fromCentre - front, 2.0) / 7.0) * (1.0 - step(0.999, uReveal));
    color = color * drawn + uColor * edge * (lines * 2.5 + 0.08);

    // Dimmer beyond the edge of the world.
    color *= mix(0.3, 1.0, 1.0 - smoothstep(uRadius, uRadius + 45.0, fromCentre));
    color *= 1.0 - fogAmount(vDepth);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`
