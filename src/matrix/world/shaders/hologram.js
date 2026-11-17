import { FOG, HASH, TIME } from './chunks.js'

/** An image projected as a hologram: tinted, scanlined, flickering, glitching now and then. */
export const hologramVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }
`

export const hologramFragment = /* glsl */ `
  ${TIME}
  ${HASH}
  ${FOG}

  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTrue;     // 0: pure green hologram, 1: the image's real colours
  uniform float uFrame;    // 1 draws a bright frame around the image
  uniform float uGlitch;

  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vec2 uv = vUv;
    // Now and then, a few rows slip sideways.
    float row = floor(uv.y * 46.0);
    float slip = step(0.985 - uGlitch * 0.3, hash21(vec2(row, floor(uTime * 13.0))));
    uv.x += slip * (hash21(vec2(row * 1.7, floor(uTime * 21.0))) - 0.5) * 0.07;

    vec4 image = texture2D(uMap, uv);
    float luma = dot(image.rgb, vec3(0.299, 0.587, 0.114));
    vec3 color = mix(uColor * (0.2 + luma * 1.7), image.rgb * 1.3, uTrue);

    float scan = 0.8 + 0.2 * sin(vUv.y * 300.0 - uTime * 7.0);
    float sweep = exp(-pow(fract(uTime * 0.2) * 1.4 - 0.2 - vUv.y, 2.0) * 260.0);
    float flicker = 0.92 + 0.08 * hash21(vec2(floor(uTime * 24.0), 3.0));
    color = (color * scan + uColor * sweep * 0.7 * luma) * image.a * flicker;

    vec2 toEdge = min(vUv, 1.0 - vUv);
    float frame = 1.0 - smoothstep(0.0, 0.01, min(toEdge.x, toEdge.y));
    color += uColor * frame * uFrame * 1.2;

    gl_FragColor = vec4(color * uIntensity * (1.0 - fogAmount(vDepth)), 1.0);
    #include <colorspace_fragment>
  }
`
