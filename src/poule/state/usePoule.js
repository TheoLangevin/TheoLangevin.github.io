import { create } from 'zustand'
import { achievementById } from '../config/achievements.js'
import { DEFAULT_BET } from '../config/economy.js'
import { DEFAULT_MODE_ID, modeById } from '../config/modes.js'
import { BREAK_REMINDER_MINUTES } from '../config/progression.js'
import { TIMING } from '../config/timing.js'
import { AUTOCASH_TARGETS } from '../config/upgrades.js'
import { openStore } from '../data/openStore.js'
import { rollEvent } from '../domain/events.js'
import { multiplierAt } from '../domain/multiplier.js'
import { canCashOut } from '../domain/round.js'
import { createGameService, GameError } from '../services/gameService.js'
import { multiplierLabel, tokens } from '../ui/format.js'

const revealOf = ({ round, fatalLane }) => ({ seed: round.seed, seedHash: round.seedHash, fatalLane })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const EMPTY_SCENE = Object.freeze({ lane: 0, hop: 0, deadLane: null, threat: null })

/** Services live outside React state: they are not data to render. */
const runtime = { service: null, ready: null, lastBreak: Date.now(), roundsSinceEvent: 0 }

/** The game service, once the database is open (for the account layer). */
export const gameService = async () => {
  await usePoule.getState().init()
  return runtime.service
}

/** Lets the account layer show its own notices in the same stack. */
export const pushNotice = (notice) =>
  usePoule.setState((state) => ({ notices: [...state.notices, { id: uid(), ...notice }].slice(-4) }))

let nextId = 1
const uid = () => nextId++

/** What the screens need to know about the round in progress. */
const roundView = (round) =>
  round && {
    modeId: round.mode.id,
    betCents: round.betCents,
    lane: round.lane,
    seedHash: round.seedHash,
    canCashOut: canCashOut(round),
  }

/** Notices for what a finished round or a purchase unlocked. */
function progressNotices(progress) {
  if (!progress) return []
  const notices = progress.achievements.map((id) => {
    const achievement = achievementById(id)
    return {
      id: uid(),
      kind: 'achievement',
      title: achievement.label,
      detail: `Succès débloqué · +${achievement.reward} plumes`,
    }
  })
  if (progress.levelUp) {
    notices.push({
      id: uid(),
      kind: 'level',
      title: `Niveau ${progress.levelUp} !`,
      detail: 'De nouvelles améliorations sont disponibles',
    })
  }
  return notices
}

/**
 * UI state of La Poule Traverse. Phases: loading → ready. While a round runs,
 * `round` is set; `scene` drives the animations of the road (where the hen
 * is, which lane killed her), `fx` the one-shot effects (sound, confetti,
 * shake), `notices` the stacked messages and `reveal` the fairness panel.
 */
export const usePoule = create((set, get) => {
  const refresh = (extra = {}) =>
    set({ ...runtime.service.summary(), round: roundView(runtime.service.round), ...extra })

  const fx = (type, detail = {}) => ({ fx: { id: uid(), type, ...detail } })

  const notify = (notices) => {
    if (notices.length) set((state) => ({ notices: [...state.notices, ...notices].slice(-4) }))
  }

  const fail = (error) => {
    if (!(error instanceof GameError)) console.error(error)
    set({ busy: false, toast: { kind: 'lose', title: error.message, detail: null, id: uid() } })
  }

  /** After every finished round, maybe a random event (wheel, tornado, double hen). */
  function maybeEvent() {
    runtime.roundsSinceEvent++
    const id = rollEvent(Math.random, runtime.roundsSinceEvent)
    if (!id) return
    runtime.roundsSinceEvent = 0
    // Let the round's result show first. It still comes if a new round has
    // started meanwhile: an event may interrupt play, it is never skipped.
    setTimeout(() => {
      if (!get().event) set({ event: { id, key: uid() } })
    }, 1500)
  }

  const featherDetail = (progress) => `+${progress.feathers} plumes${progress.doubled ? ' (×2)' : ''}`

  function finish(result) {
    const { round, progress } = result
    maybeEvent()
    refresh({
      busy: false,
      reveal: revealOf(result),
      ...fx('win', { multiplier: round.multiplier }),
      toast: {
        kind: 'win',
        title: `+${tokens(round.payoutCents)} jetons`,
        detail: `${multiplierLabel(round.multiplier)} après ${round.lane} voie${round.lane > 1 ? 's' : ''} · ${featherDetail(progress)}`,
        id: uid(),
      },
    })
    notify(progressNotices(progress))
  }

  /** Once in a while, a gentle nudge to take a break. */
  function maybeRemindBreak() {
    if (Date.now() - runtime.lastBreak < BREAK_REMINDER_MINUTES * 60_000) return
    runtime.lastBreak = Date.now()
    notify([
      {
        id: uid(),
        kind: 'break',
        title: `Ça fait ${BREAK_REMINDER_MINUTES} minutes`,
        detail: 'Une petite pause ? La poule vous attendra.',
      },
    ])
  }

  const hopDuration = () => (runtime.service.owns('turbo') ? TIMING.hopTurbo : TIMING.hop)

  return {
    phase: 'loading',
    persistent: true,
    storageError: null,
    busy: false,
    modeId: DEFAULT_MODE_ID,
    betCents: DEFAULT_BET,
    autocashTarget: null,
    sound: true,
    haptics: true,
    balanceCents: 0,
    history: [],
    stats: null,
    byMode: [],
    progression: null,
    round: null,
    scene: EMPTY_SCENE,
    reveal: null,
    toast: null,
    notices: [],
    fx: null,
    event: null,
    celebration: null,
    doubleNext: false,

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
          storageError: opened.persistent ? null : 'Hors ligne : cette partie ne sera pas sauvegardée.',
          modeId: round?.mode.id ?? preferences.modeId,
          betCents: round?.betCents ?? preferences.betCents,
          autocashTarget: preferences.autocashTarget,
          sound: preferences.sound,
          haptics: preferences.haptics,
          scene: { ...EMPTY_SCENE, lane: round?.lane ?? 0 },
        })
      })()
      return runtime.ready
    },

    setMode(modeId) {
      if (get().round || get().busy) return
      const id = modeById(modeId).id
      runtime.service.savePreferences({ modeId: id })
      set({ modeId: id, scene: EMPTY_SCENE, reveal: null, toast: null })
    },

    setBet(betCents) {
      if (get().round) return
      runtime.service.savePreferences({ betCents })
      set({ betCents })
    },

    setAutocash(target) {
      const value = AUTOCASH_TARGETS.includes(target) ? target : null
      runtime.service.savePreferences({ autocashTarget: value })
      set({ autocashTarget: value })
    },

    toggleSound() {
      const sound = !get().sound
      runtime.service.savePreferences({ sound })
      set({ sound })
    },

    /** Starts a round, or takes one more step if one is running. */
    async play() {
      const { round, busy, modeId, betCents } = get()
      if (busy || get().phase !== 'ready') return
      if (round) return get().step()
      maybeRemindBreak()
      set({ busy: true, toast: null, reveal: null })
      try {
        await runtime.service.start({ modeId, betCents })
        refresh({ busy: false, scene: EMPTY_SCENE, ...fx('start') })
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
      const hit = result.event === 'hit'
      set((state) => ({
        busy: true,
        scene: { lane, hop: state.scene.hop + 1, deadLane: null, threat: hit ? lane : null },
        ...fx('hop', { lane }),
      }))

      if (hit) {
        await sleep(TIMING.crashImpact)
        set((state) => ({ scene: { ...state.scene, deadLane: lane }, ...fx('crash') }))
        await sleep(TIMING.crashResult - TIMING.crashImpact)
        const feathers = result.progress.feathers
        refresh({
          busy: false,
          reveal: revealOf(result),
          toast: {
            kind: 'lose',
            title: 'Écrasée !',
            detail: `Voie ${lane} : mise de ${tokens(result.round.betCents)} jetons perdue${feathers ? ` · ${featherDetail(result.progress)}` : ''}`,
            id: uid(),
          },
        })
        notify(progressNotices(result.progress))
        maybeEvent()
        return
      }

      await sleep(hopDuration())
      if (result.event === 'finished') return finish(result)
      refresh({ busy: false })

      // Auto cash-out, if bought and set, once the target is reached.
      const { autocashTarget } = get()
      if (autocashTarget && runtime.service.owns('autocash')) {
        if (multiplierAt(result.round.mode, lane) >= autocashTarget) get().cashOut()
      }
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

    buy(upgradeId) {
      if (get().busy) return
      try {
        const { upgrade, achievements } = runtime.service.buy(upgradeId)
        // The hidden item gets its own party.
        refresh({ ...fx('buy'), celebration: upgrade.secret ? upgrade.id : get().celebration })
        notify([
          {
            id: uid(),
            kind: 'buy',
            title: upgrade.label,
            detail: upgrade.slot === 'perk' ? 'Atout activé' : 'Acheté et équipé',
          },
          ...progressNotices({ achievements, levelUp: null }),
        ])
      } catch (error) {
        fail(error)
      }
    },

    toggleEquip(upgradeId) {
      try {
        runtime.service.toggleEquip(upgradeId)
        refresh()
      } catch (error) {
        fail(error)
      }
    },

    clearStats() {
      if (get().round || get().busy) return
      try {
        runtime.service.clearStats()
        refresh({ reveal: null, toast: null, scene: EMPTY_SCENE })
      } catch (error) {
        fail(error)
      }
    },

    refill() {
      if (get().round || get().busy) return
      try {
        const amount = runtime.service.refill()
        refresh(fx('buy'))
        notify([
          { id: uid(), kind: 'buy', title: `+${tokens(amount)} jetons`, detail: 'Recharge offerte. Bonne route !' },
        ])
      } catch (error) {
        fail(error)
      }
    },

    /** Collects a season reward (found by the account layer). */
    applySeasonReward(claim) {
      const reward = claim()
      refresh(fx('win', { multiplier: 10 }))
      notify(progressNotices({ achievements: reward.achievements, levelUp: null }))
      return reward
    },

    toggleHaptics() {
      const haptics = !get().haptics
      runtime.service.savePreferences({ haptics })
      set({ haptics })
    },

    dismissToast(id) {
      if (get().toast?.id === id) set({ toast: null })
    },

    /** Re-reads everything from the game service (after a save came from the account). */
    reload() {
      if (!runtime.service || get().round) return
      const preferences = runtime.service.preferences()
      refresh({
        modeId: preferences.modeId,
        betCents: preferences.betCents,
        autocashTarget: preferences.autocashTarget,
        sound: preferences.sound,
        haptics: preferences.haptics,
        scene: EMPTY_SCENE,
        reveal: null,
        toast: null,
      })
    },

    /** Applies a random event's bonus (domain/events.js) and says what it gave. */
    resolveEvent(bonus, notice) {
      try {
        const granted = runtime.service.grantBonus(bonus)
        refresh({ event: null, ...(bonus.tokens || bonus.feathers ? fx('buy') : {}) })
        notify([
          { id: uid(), kind: 'buy', ...notice },
          ...progressNotices({ achievements: granted.achievements, levelUp: null }),
        ])
      } catch (error) {
        set({ event: null })
        fail(error)
      }
    },

    dismissEvent: () => set({ event: null }),

    closeCelebration: () => set({ celebration: null }),

    dismissNotice(id) {
      set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) }))
    },
  }
})
