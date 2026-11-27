import { create } from 'zustand'
import { GOLDEN_EVERY, GOLDEN_STAYS, MAX_TAPS_PER_CALL, RARE_EGG_CHANCE } from '../config/coop.js'
import * as rules from '../domain/coop.js'
import { GameError } from '../services/gameService.js'
import { tokens } from '../ui/format.js'
import { eggs as eggLabel } from '../ui/coop/format.js'
import { gameService, pushNotice, usePoule } from './usePoule.js'

/** How often the coop lays (ms), keeps itself (ms) and tells the account (ms). */
const TICK = 250
const KEEP = 5_000
const SYNC = 60_000

const runtime = { service: null, timer: null, lastTick: 0, lastKeep: 0, lastSync: 0 }

const nextGoldenAt = (coop, now) =>
  now + ((GOLDEN_EVERY.min + Math.random() * (GOLDEN_EVERY.max - GOLDEN_EVERY.min)) * 1000) / rules.goldenSpeed(coop)

/**
 * UI state of the coop. The coop lives here while the tab is open (taps
 * are instant); the game service keeps it every few seconds and tells the
 * account now and then, or right after a purchase.
 */
export const useCoop = create((set, get) => {
  const fxBuy = () => usePoule.setState({ fx: { id: Date.now() + Math.random(), type: 'buy' } })

  /** Applies a change, then trophies/reveals; tells about what is new. */
  function apply(next, { sync = false } = {}) {
    const { coop, trophies } = rules.refresh(rules.rollDay(next, Date.now()))
    set({ coop })
    for (const trophy of trophies) {
      pushNotice({ kind: 'achievement', title: `${trophy.icon} ${trophy.label}`, detail: 'Trophée du poulailler · +2 % de production' })
    }
    if (sync || trophies.length) keep(true)
    return coop
  }

  function keep(sync = false) {
    const { coop, stamp } = get()
    if (!runtime.service || !coop) return
    runtime.lastKeep = Date.now()
    if (sync) runtime.lastSync = Date.now()
    try {
      if (!runtime.service.coopSave(coop, { stamp, sync })) reopen()
    } catch (error) {
      console.error(error)
    }
  }

  function reopen() {
    const opened = runtime.service.coopOpen()
    set({ coop: opened.coop, stamp: opened.stamp, away: opened.away })
    if (opened.boost > 0) pushNotice({ kind: 'level', title: `🔥 Frénésie de la route : ${opened.boost} s`, detail: 'Gagnée en traversant à ×3 ou plus' })
    if (opened.away || opened.boost > 0) keep(true)
  }

  function loop() {
    const now = Date.now()
    const { coop, golden } = get()
    if (!coop) return
    const seconds = Math.min(5, (now - runtime.lastTick) / 1000)
    runtime.lastTick = now
    let next = rules.tick(coop, seconds, now)
    const patch = {}
    if (golden && now > golden.until) patch.golden = null
    if (!golden && rules.unlocked(next, 'golden') && now >= get().goldenAt) {
      patch.golden = { x: 10 + Math.random() * 75, y: 15 + Math.random() * 55, until: now + GOLDEN_STAYS * 1000, id: now }
      patch.goldenAt = nextGoldenAt(next, now + GOLDEN_STAYS * 1000)
    }
    set(patch)
    next = apply(next)
    if (now - runtime.lastSync > SYNC) keep(true)
    else if (now - runtime.lastKeep > KEEP) keep(false)
  }

  const hatchedNotice = (result, from) => {
    const hen = result.hen
    pushNotice({
      kind: 'achievement',
      title: `${hen.icon} ${hen.label}${result.fresh ? ' rejoint le poulailler !' : result.eggs ? ' (déjà au max)' : ` passe niveau ${result.level}`}`,
      detail: result.eggs ? `${from} · +${eggLabel(result.eggs)} œufs` : `${from} · ${hen.detail}`,
    })
  }

  return {
    coop: null,
    stamp: 0,
    away: null,
    golden: null,
    goldenAt: Infinity,
    frenzyFlash: 0,

    /** Opens the coop when its tab shows; returns a function closing it. */
    async open() {
      runtime.service = await gameService()
      reopen()
      const now = Date.now()
      runtime.lastTick = now
      runtime.lastKeep = now
      runtime.lastSync = now
      set({ goldenAt: nextGoldenAt(get().coop, now) })
      clearInterval(runtime.timer)
      runtime.timer = setInterval(loop, TICK)
      const hide = () => document.visibilityState === 'hidden' && keep(true)
      const show = () => document.visibilityState === 'visible' && reopen()
      document.addEventListener('visibilitychange', hide)
      document.addEventListener('visibilitychange', show)
      return () => {
        clearInterval(runtime.timer)
        document.removeEventListener('visibilitychange', hide)
        document.removeEventListener('visibilitychange', show)
        keep(true)
      }
    },

    dismissAway() {
      set({ away: null })
    },

    /** Taps on the big hen; returns the eggs laid (for the floating number). */
    tap(n = 1) {
      const { coop } = get()
      if (!coop) return 0
      const count = Math.min(MAX_TAPS_PER_CALL, n)
      const now = Date.now()
      const rolls = Array.from({ length: count }, Math.random)
      let next = rules.tap(coop, count, now, rolls)
      const laid = next.eggs - coop.eggs
      if (rules.unlocked(next, 'hens') && Math.random() < RARE_EGG_CHANCE * count) {
        const hen = rules.drawHen(Math.random(), Math.random())
        const result = rules.receiveHen(next, hen)
        next = result.coop
        hatchedNotice({ ...result, hen }, 'Œuf rare')
      }
      apply(next)
      return { laid, lucky: laid > rules.tapValue(coop, now) * count * 2 }
    },

    buyMode: 1,
    setBuyMode(mode) {
      set({ buyMode: mode })
    },

    buyBuilding(id) {
      const { coop, buyMode } = get()
      const next = rules.buyBuildings(coop, id, buyMode)
      if (next === coop) return
      fxBuy()
      apply(next, { sync: true })
    },

    buyUpgrade(id) {
      const { coop } = get()
      const next = rules.buyUpgrade(coop, id)
      if (next === coop) return
      fxBuy()
      apply(next, { sync: true })
    },

    hatch() {
      const result = rules.hatch(get().coop, Math.random(), Math.random())
      if (!result) return
      fxBuy()
      apply(result.coop, { sync: true })
      hatchedNotice(result, result.ticket ? 'Ticket de couveuse' : 'Couveuse')
      return result
    },

    toggleHen(id) {
      const { coop } = get()
      apply(coop.equipped.includes(id) ? rules.unequipHen(coop, id) : rules.equipHen(coop, id), { sync: true })
    },

    buySkin(id) {
      const { coop } = get()
      const next = rules.buySkin(coop, id)
      if (next === coop) return
      fxBuy()
      apply(rules.wearSkin(next, id), { sync: true })
    },

    wearSkin(id) {
      apply(rules.wearSkin(get().coop, id), { sync: true })
    },

    catchGolden() {
      const { coop, golden } = get()
      if (!golden) return
      const now = Date.now()
      const result = rules.caughtGolden(coop, now, Math.random(), Math.random(), Math.random())
      set({ golden: null, frenzyFlash: result.reward === 'frenzy' ? now : get().frenzyFlash })
      usePoule.setState({ fx: { id: now, type: 'win', multiplier: 5 } })
      apply(result.coop, { sync: true })
      if (result.reward === 'frenzy') pushNotice({ kind: 'level', title: '🌟 Frénésie !', detail: `Production ×7 pendant ${rules.frenzySeconds(coop)} s` })
      else if (result.reward === 'rain') pushNotice({ kind: 'level', title: '🌟 Pluie d’œufs !', detail: `+${eggLabel(result.eggs)} œufs` })
      else hatchedNotice(result, 'Œuf doré')
    },

    sell() {
      const { coop, stamp } = get()
      try {
        const result = runtime.service.coopSell(coop, { stamp })
        set({ coop: result.coop })
        runtime.lastKeep = Date.now()
        runtime.lastSync = Date.now()
        usePoule.getState().reload()
        usePoule.setState({ fx: { id: Date.now(), type: 'win', multiplier: 2 } })
        pushNotice({ kind: 'level', title: `+${tokens(result.cents)} jetons`, detail: 'Vendu au marché aux œufs' })
      } catch (error) {
        if (!(error instanceof GameError)) console.error(error)
        pushNotice({ kind: 'break', title: error.message, detail: null })
        if (error.code === 'coop-stale') reopen()
      }
    },

    claimOrder(index) {
      const result = rules.claimOrder(get().coop, index, Date.now())
      if (!result) return
      usePoule.setState({ fx: { id: Date.now(), type: 'win', multiplier: 3 } })
      apply(result.coop, { sync: true })
      pushNotice({
        kind: 'level',
        title: `📦 Commande livrée : +${eggLabel(result.eggs)} œufs`,
        detail: result.ticket ? 'Les 3 commandes du jour : +1 ticket de couveuse' : 'Commande du fermier',
      })
      if (result.hen) {
        pushNotice({ kind: 'achievement', title: `${result.hen.icon} ${result.hen.label}`, detail: `Cadeau de l’événement · niveau ${get().coop.hens[result.hen.id]}` })
      }
    },

    claimCalendar() {
      const result = rules.claimCalendar(get().coop, Date.now())
      if (!result) return
      usePoule.setState({ fx: { id: Date.now(), type: 'win', multiplier: result.day === 7 ? 10 : 2 } })
      apply(result.coop, { sync: true })
      pushNotice({
        kind: 'level',
        title: `📅 Jour ${result.day} : +${eggLabel(result.eggs)} œufs`,
        detail: result.tickets ? `+${result.tickets} ticket${result.tickets > 1 ? 's' : ''} de couveuse` : 'Reviens demain pour la suite',
      })
    },

    claimFamily(index, familyEggs) {
      const result = rules.claimFamily(get().coop, index, familyEggs)
      if (!result) return
      fxBuy()
      apply(result.coop, { sync: true })
      pushNotice({ kind: 'level', title: `👨‍👩‍👧 Objectif de famille`, detail: `+${result.tickets} ticket${result.tickets > 1 ? 's' : ''} de couveuse` })
    },

    moveHouse() {
      const result = rules.moveHouse(get().coop)
      if (!result) return
      usePoule.setState({ fx: { id: Date.now(), type: 'win', multiplier: 10 } })
      apply(result.coop, { sync: true })
      pushNotice({ kind: 'level', title: `🚚 Déménagement réussi`, detail: `+${result.gained} plume${result.gained > 1 ? 's' : ''} d’or` })
    },

    buyPerk(id) {
      const { coop } = get()
      const next = rules.buyPerk(coop, id)
      if (next === coop) return
      fxBuy()
      apply(next, { sync: true })
    },
  }
})
