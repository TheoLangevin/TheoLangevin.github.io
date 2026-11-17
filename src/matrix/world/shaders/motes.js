import { FOG, TIME } from './chunks.js'

/**
 * Luminous specks drifting in the air. They live in a box that wraps around
 * the camera, so a few hundred points fill the whole world.
 */
export const motesVertex = /* glsl */ `
  ${TIME}
  ${FOG}

  attribute vec4 aSeed;        // xyz: place in the box, w: size and phase
  uniform float uViewport;     // half the height of the drawing buffer, in pixels

  varying float vAlpha;

  const vec3 BOX = vec3(70.0, 20.0, 70.0);

  void main() {
    vec3 p = aSeed.xyz * BOX;
    p.x += sin(uTime * 0.11 + aSeed.y * 40.0) * 1.6;
    p.y += uTime * (0.06 + aSeed.x * 0.22);
    p.z += cos(uTime * 0.09 + aSeed.x * 40.0) * 1.6;

    vec3 centre = vec3(cameraPosition.x, 9.5, cameraPosition.z);
    p = mod(p - centre + BOX * 0.5, BOX) - BOX * 0.5 + centre;

    vec4 view = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;

    float size = 0.05 + aSeed.w * 0.09;
    gl_PointSize = size * projectionMatrix[1][1] * uViewport / max(-view.z, 0.1);

    float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed.z * 2.6) + aSeed.w * 31.0);
    vAlpha = twinkle * (1.0 - fogAmount(-view.z)) * smoothstep(0.4, 2.0, -view.z);
  }
`

export const motesFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float glow = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * glow * glow * vAlpha, 1.0);
    #include <colorspace_fragment>
  }
`
