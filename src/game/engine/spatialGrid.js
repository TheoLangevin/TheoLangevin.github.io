/**
 * Uniform grid used to find the enemies near a point without scanning them all.
 * Items are indexed by their centre, so callers widen their query by the
 * largest item radius.
 */
const keyOf = (cx, cy) => (cx + 512) * 1024 + (cy + 512)

export function createGrid(cellSize) {
  return { cellSize, cells: new Map() }
}

export function rebuildGrid(grid, items) {
  for (const bucket of grid.cells.values()) bucket.length = 0
  for (const item of items) {
    const key = keyOf(Math.floor(item.x / grid.cellSize), Math.floor(item.y / grid.cellSize))
    let bucket = grid.cells.get(key)
    if (!bucket) grid.cells.set(key, (bucket = []))
    bucket.push(item)
  }
}

/** Calls `visit(item)` for every item whose cell overlaps the query square. */
export function queryGrid(grid, x, y, range, visit) {
  const size = grid.cellSize
  const minX = Math.floor((x - range) / size)
  const maxX = Math.floor((x + range) / size)
  const minY = Math.floor((y - range) / size)
  const maxY = Math.floor((y + range) / size)
  for (let cx = minX; cx <= maxX; cx++) {
    for (let cy = minY; cy <= maxY; cy++) {
      const bucket = grid.cells.get(keyOf(cx, cy))
      if (!bucket) continue
      for (let i = 0; i < bucket.length; i++) visit(bucket[i])
    }
  }
}
