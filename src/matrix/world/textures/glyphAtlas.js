import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from 'three'
import { RAIN_GLYPHS } from '../../boot/glyphs.js'

/** The atlas is a grid of ATLAS_COLUMNS x ATLAS_COLUMNS glyphs (see shaders/chunks.js). */
export const ATLAS_COLUMNS = 8
const CELL = 64
const FALLBACK_GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ:.=*+-<>|/\\[]{}#$%&@?!^~_;'
const FONT = 'bold 44px ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", monospace'

/** False when the device has no font for the character and would draw an empty box. */
function canDraw(character) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 24
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const render = (text) => {
    context.clearRect(0, 0, 24, 24)
    context.font = '18px monospace'
    context.textBaseline = 'top'
    context.fillStyle = '#fff'
    context.fillText(text, 2, 2)
    return context.getImageData(0, 0, 24, 24).data
  }
  const missing = Array.from(render('￿'))
  const drawn = render(character)
  return drawn.some((value) => value > 0) && drawn.some((value, i) => value !== missing[i])
}

/**
 * Texture holding every glyph of the code rain, white on black. The rain
 * shaders pick cells from it, so thousands of changing characters cost a
 * single texture.
 */
export function createGlyphAtlas() {
  const katakana = canDraw('ｱ') && canDraw('ﾜ')
  const glyphs = [...(katakana ? RAIN_GLYPHS : FALLBACK_GLYPHS)]

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = ATLAS_COLUMNS * CELL
  const context = canvas.getContext('2d')
  context.fillStyle = '#000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#fff'
  context.font = FONT
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  for (let i = 0; i < ATLAS_COLUMNS * ATLAS_COLUMNS; i++) {
    const x = (i % ATLAS_COLUMNS) * CELL + CELL / 2
    const y = Math.floor(i / ATLAS_COLUMNS) * CELL + CELL / 2
    context.save()
    context.translate(x, y)
    if (katakana) context.scale(-1, 1) // mirrored, as on a screen seen from behind
    context.fillText(glyphs[i % glyphs.length], 0, 3)
    context.restore()
  }

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = true
  return texture
}
