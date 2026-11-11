/** Neon grid floor: bright inside the arena, fading out beyond its rim. */

export const vertexShader = /* glsl */ `
  varying vec2 vGround;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vGround = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const fragmentShader = /* glsl */ `
  uniform float uRadius;
  uniform float uTime;
  uniform vec3 uGrid;
  uniform vec3 uRim;
  uniform vec3 uBase;

  varying vec2 vGround;

  // Anti-aliased grid lines every "size" units.
  float gridLines(vec2 p, float size, float width) {
    vec2 cell = p / size;
    vec2 line = abs(fract(cell - 0.5) - 0.5) / fwidth(cell);
    return 1.0 - min(min(line.x, line.y) / width, 1.0);
  }

  void main() {
    float distance = length(vGround);
    float inside = 1.0 - smoothstep(uRadius - 0.3, uRadius + 0.3, distance);
    float outerFade = 1.0 - smoothstep(uRadius, uRadius + 34.0, distance);

    float fine = gridLines(vGround, 2.0, 1.0) * 0.28;
    float coarse = gridLines(vGround, 8.0, 1.6) * 0.55;
    float pulse = 0.75 + 0.25 * sin(uTime * 1.5 - distance * 0.35);

    vec3 color = uBase * (0.6 + 0.4 * inside);
    color += uGrid * (fine + coarse) * pulse * mix(0.18, 1.0, inside) * outerFade;

    float rim = smoothstep(0.45, 0.0, abs(distance - uRadius));
    color += uRim * rim;

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`
