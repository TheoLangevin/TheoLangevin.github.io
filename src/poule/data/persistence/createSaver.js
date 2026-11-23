/**
 * Saves the database file a moment after the last write, so a burst of
 * writes costs one save, and right away when the page is hidden or closed.
 */
export function createSaver({ exportFile, saveFile, delay = 300, onError = () => {} }) {
  let timer = null
  let dirty = false
  let saving = Promise.resolve()

  async function flush() {
    clearTimeout(timer)
    timer = null
    if (!dirty) return saving
    dirty = false
    saving = saving
      .then(() => saveFile(exportFile()))
      .then((ok) => ok || onError(new Error('The game could not be saved in this browser')))
      .catch(onError)
    return saving
  }

  function schedule() {
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  const onHide = () => {
    if (document.visibilityState === 'hidden') flush()
  }

  function listen() {
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
    }
  }

  return { schedule, flush, listen }
}
