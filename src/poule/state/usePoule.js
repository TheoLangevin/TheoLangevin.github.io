import { create } from 'zustand'
import { TIMING } from '../config/timing.js'
import { DEFAULT_BET } from '../config/economy.js'
import { DEFAULT_MODE_ID, modeById } from '../config/modes.js'
import { openStore } from '../data/openStore.js'
import { canCashOut } from '../domain/round.js'
import { createGameService, GameError } from '../services/gameService.js'
import { multiplierLabel, tokens } from '../ui/format.js'

const revealOf = ({ round, fatalLane }) => ({ seed: round.seed, seedHash: round.seedHash, fatalLane })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Services live outside React state: they are not data to render. */
const runtime = { service: null, ready: null }

/** What the screens need to know about the round in progress. */
const roundView = (round) =>
  round && {
    modeId: round.mode.id,
    betCents: round.betCents,
    lane: round.lane,
    seedHash: round.seedHash,
    canCashOut: canCashOut(round),
  }

/**
 * UI state of La Poule Traverse. Phases: loading → ready. While a round runs,
 * `round` is set; `scene` drives the animations of the road (where the hen
 * is, which lane killed her) and `reveal` the fairness panel after a round.
 */
export const usePoule = create((set, get) => {
  const refresh = (extra = {}) =>
    set({ ...runtime.service.summary(), round: roundView(runtime.service.round), ...extra })

  const fail = (error) => {
    if (!(error instanceof GameError)) console.error(error)
    set({ busy: false, toast: { kind: 'lose', title: error.message, detail: null, id: Date.now() } })
  }

  function finish(result) {
    const { round } = result
    refresh({
      busy: false,
      reveal: revealOf(result),
      toast: {
        kind: 'win',
        title: `+${tokens(round.payoutCents)} jetons`,
        detail: `${multiplierLabel(round.multiplier)} après ${round.lane} voie${round.lane > 1 ? 's' : ''}`,
        id: Date.now(),
      },
    })
  }

  return {
    phase: 'loading',
    persistent: true,
    storageError: null,
    busy: false,
    modeId: DEFAULT_MODE_ID,
    betCents: DEFAULT_BET,
    balanceCents: 0,
    history: [],
    stats: null,
    byMode: [],
    round: null,
    scene: { lane: 0, hop: 0, deadLane: null, threat: null },
    reveal: null,
    toast: null,

    /** Opens the database once, even if called twice (React StrictMode). */
    init() {
      runtime.ready ??= (async () => {
        const opened = await openStore({
          onSaveError: (error) => set({ storageError: error.message }),
        })
        runtime.service = createGameService({ store: opened.store })
        const round = await runtime.service.resume()
        const preferences = runtime.service.preferences()
        refresh({
          phase: 'ready',
          persistent: opened.persistent,
          storageError: opened.persistent ? null : 'SQLite n’a pas pu se charger : la partie ne sera pas sauvegardée.',
          modeId: round?.mode.id ?? preferences.modeId,
          betCents: round?.betCents ?? preferences.betCents,
          scene: { lane: round?.lane ?? 0, hop: 0, deadLane: null, threat: null },
        })
      })()
      return runtime.ready
    },

    setMode(modeId) {
      if (get().round || get().busy) return
      const id = modeById(modeId).id
      runtime.service.savePreferences({ modeId: id })
      set({ modeId: id, scene: { lane: 0, hop: 0, deadLane: null, threat: null }, reveal: null, toast: null })
    },

    setBet(betCents) {
      if (get().round) return
      runtime.service.savePreferences({ betCents })
      set({ betCents })
    },

    /** Starts a round, or takes one more step if one is running. */
    async play() {
      const { round, busy, modeId, betCents } = get()
      if (busy || get().phase !== 'ready') return
      if (round) return get().step()
      set({ busy: true, toast: null, reveal: null })
      try {
        await runtime.service.start({ modeId, betCents })
        refresh({ busy: false, scene: { lane: 0, hop: 0, deadLane: null, threat: null } })
      } catch (error) {
        fail(error)
      }
    },

    async step() {
      if (get().busy || !get().round) return
      let result
      try {
        result = runtime.service.step()
      } catch (error) {
        return fail(error)
      }
      const { lane } = result
      set((state) => ({
        busy: true,
        scene: { lane, hop: state.scene.hop + 1, deadLane: null, threat: result.event === 'hit' ? lane : null },
      }))

      if (result.event === 'hit') {
        await sleep(TIMING.crashImpact)
        set((state) => ({ scene: { ...state.scene, deadLane: lane } }))
        await sleep(TIMING.crashResult - TIMING.crashImpact)
        refresh({
          busy: false,
          reveal: revealOf(result),
          toast: {
            kind: 'lose',
            title: 'Écrasée !',
            detail: `Voie ${lane} : mise de ${tokens(result.round.betCents)} jetons perdue`,
            id: Date.now(),
          },
        })
        return
      }

      await sleep(TIMING.hop)
      if (result.event === 'finished') return finish(result)
      refresh({ busy: false })
    },

    cashOut() {
      const { round, busy } = get()
      if (busy || !round?.canCashOut) return
      try {
        finish(runtime.service.cashOut())
      } catch (error) {
        fail(error)
      }
    },

    reset() {
      if (get().round || get().busy) return
      try {
        runtime.service.reset()
        refresh({ reveal: null, toast: null, scene: { lane: 0, hop: 0, deadLane: null, threat: null } })
      } catch (error) {
        fail(error)
      }
    },

    dismissToast(id) {
      if (get().toast?.id === id) set({ toast: null })
    },
  }
})
