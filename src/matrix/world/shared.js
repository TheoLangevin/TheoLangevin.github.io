import { Vector3 } from 'three'
import { createGlyphAtlas } from './textures/glyphAtlas.js'

export const FOG_DENSITY = 0.017

/**
 * Uniforms shared by every shader of the world. Materials hold references to
 * these same objects, so updating a value here once per frame updates them all.
 */
export const shared = {
  uTime: { value: 0 },
  uPlayer: { value: new Vector3() },
  uFogDensity: { value: FOG_DENSITY },
  uAtlas: { value: null },
  /** 0..1: how far the world has been drawn during the arrival. */
  uReveal: { value: 1 },
}

export function prepareShared() {
  if (!shared.uAtlas.value) shared.uAtlas.value = createGlyphAtlas()
}
