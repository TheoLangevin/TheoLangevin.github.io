import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'

export const TEXT_FONT = '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace'

const MAX_WIDTH = 2048
const LINE_HEIGHT = 1.12

const fontOf = (line) => `${line.weight ?? 700} ${line.size ?? 64}px ${TEXT_FONT}`

/**
 * Draws lines of text on a canvas and returns it as a texture, with its aspect
 * ratio. Each line is `{ text, size, weight, color, spacing }` (sizes in
 * pixels, letter spacing in em). Text is white by default so the material can
 * tint it.
 */
export function createTextTexture(lines, { align = 'center', gap = 0.32 } = {}) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  const rows = lines.map((line) => {
    const size = line.size ?? 64
    const characters = [...line.text]
    context.font = fontOf(line)
    const widths = characters.map((character) => context.measureText(character).width)
    const tracking = (line.spacing ?? 0.06) * size
    const width = widths.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, characters.length - 1)
    return { line, size, characters, widths, tracking, width }
  })

  const padding = Math.max(16, rows[0].size * 0.22)
  const contentWidth = Math.max(1, ...rows.map((row) => row.width))
  const contentHeight = rows.reduce((sum, row, i) => sum + row.size * (LINE_HEIGHT + (i > 0 ? gap : 0)), 0)
  const scale = Math.min(1, (MAX_WIDTH - padding * 2) / contentWidth)

  canvas.width = Math.ceil((contentWidth + padding * 2) * scale)
  canvas.height = Math.ceil((contentHeight + padding * 2) * scale)
  context.scale(scale, scale)
  context.textBaseline = 'middle'

  let y = padding
  rows.forEach((row, index) => {
    if (index > 0) y += row.size * gap
    context.font = fontOf(row.line)
    context.fillStyle = row.line.color ?? '#ffffff'
    let x = padding
    if (align === 'center') x += (contentWidth - row.width) / 2
    else if (align === 'right') x += contentWidth - row.width
    const middle = y + row.size * LINE_HEIGHT * 0.5
    row.characters.forEach((character, i) => {
      context.fillText(character, x, middle)
      x += row.widths[i] + row.tracking
    })
    y += row.size * LINE_HEIGHT
  })

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  return { texture, aspect: canvas.width / canvas.height }
}
