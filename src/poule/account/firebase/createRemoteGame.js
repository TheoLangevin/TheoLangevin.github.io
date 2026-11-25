import { modeById } from '../../config/modes.js'
import { GameError } from '../../services/gameService.js'

/**
 * The game played on the server (functions/src/index.js) for a signed-in
 * player. Each action is a call to the `game` callable; the answer carries
 * the player's whole save, which replaces this device's copy (`local`, the
 * game service on the browser's database), so screens keep reading it as
 * before. Actions run one at a time, in order.
 *
 * @param {object} deps
 * @param {(data: object) => Promise<{ data: object }>} deps.call  the `game` callable
 * @param {ReturnType<import('../../services/gameService.js').createGameService>} deps.local
 * @param {(rev: number) => void} [deps.onSaved]
 */
export function createRemoteGame({ call, local, onSaved = () => {} }) {
  let round = null
  let queue = Promise.resolve()
  const revive = (value) => value && { ...value, mode: modeById(value.modeId) }

  async function exec(op, args) {
    let response
    try {
      response = (await call({ op, args })).data
    } catch (error) {
      throw new GameError(error.details?.code ?? 'server', error.message || 'Serveur indisponible, réessayez')
    }
    local.importSave(response.save)
    onSaved(response.rev)
    round = revive(response.round)
    const result = response.result
    if (result && typeof result === 'object' && result.round) result.round = revive(result.round)
    return result
  }

  return {
    /** The round in progress, as the server tells it (no seed until it is over). */
    get round() {
      return round
    },
    /** Runs a game action on the server; resolves to its result. */
    run(op, args = []) {
      const job = queue.then(() => exec(op, args))
      queue = job.catch(() => {})
      return job
    },
  }
}
