import { create } from 'zustand'
import { PseudoTakenError } from '../account/cloud.js'
import { createSyncService } from '../account/createSyncService.js'
import { createFirebaseAuth, describeAuthError } from '../account/firebase/createFirebaseAuth.js'
import { createFirestoreCloud } from '../account/firebase/createFirestoreCloud.js'
import { accountsEnabled, loadFirebase } from '../account/firebase/loadFirebase.js'
import { BOARD_SIZE } from '../config/seasons.js'
import { computeAdminStats } from '../domain/adminStats.js'
import { gameService, pushNotice, usePoule } from './usePoule.js'

/** Account services, outside React state. */
const runtime = { auth: null, sync: null, ready: null, stopListening: null }

/**
 * UI state of the player's account. Status: disabled (no Firebase config) →
 * loading → signedOut ⇄ signedIn, or unavailable if Firebase cannot load.
 * `sync` mirrors the sync service; `conflict` is set while the player has to
 * choose between this device and the account; `dialog` is the open dialog.
 */
export const useAccount = create((set, get) => {
  const sayError = (message) => message && pushNotice({ kind: 'error', title: 'Compte', detail: message })

  async function onUser(user) {
    if (!user) {
      runtime.sync.disconnect()
      set({ status: 'signedOut', user: null, pseudo: null, conflict: null, dialog: null, pendingReward: null })
      get().loadBoard()
      return
    }
    set({ status: 'signedIn', user })
    try {
      const result = await runtime.sync.connect(user)
      set({ pseudo: runtime.sync.pseudo })
      if (result.action === 'ask') set({ conflict: result.conflict, dialog: 'conflict' })
      else if (!runtime.sync.pseudo) set({ dialog: 'pseudo' })
      get().checkReward()
      get().loadBoard(get().board.kind)
    } catch (error) {
      console.error('[poule] sync failed', error)
    }
  }

  return {
    status: accountsEnabled() ? 'loading' : 'disabled',
    user: null,
    pseudo: null,
    sync: { state: 'idle', at: null, error: null },
    conflict: null,
    dialog: null,
    board: { kind: 'season', entries: [], loading: false, error: null, season: null },
    pendingReward: null,
    player: null,
    admin: { status: 'idle', stats: null, error: null },

    /** Loads Firebase and starts following the signed-in user. Safe to call twice. */
    init() {
      if (!accountsEnabled()) return Promise.resolve()
      runtime.ready ??= (async () => {
        try {
          const [firebase, game] = await Promise.all([loadFirebase(), gameService()])
          runtime.auth = createFirebaseAuth(firebase)
          runtime.sync = createSyncService({
            game,
            cloud: createFirestoreCloud(firebase),
            onStatus: (sync) => set({ sync: { error: null, ...sync } }),
            onImported: () => usePoule.getState().reload(),
          })
          game.onChange(() => runtime.sync.changed())
          // Pick up what another device saved when the player comes back here.
          let lastCheck = 0
          const check = () => {
            if (get().status !== 'signedIn' || get().conflict || Date.now() - lastCheck < 30_000) return
            lastCheck = Date.now()
            get().refresh()
          }
          window.addEventListener('focus', check)
          document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
          runtime.stopListening = runtime.auth.onUserChanged((user) => onUser(user))
        } catch (error) {
          console.warn('[poule] accounts unavailable:', error)
          set({ status: 'unavailable' })
        }
      })()
      return runtime.ready
    },

    async signIn() {
      if (!runtime.auth) return
      try {
        await runtime.auth.signIn()
      } catch (error) {
        sayError(describeAuthError(error))
      }
    },

    async signOut() {
      if (!runtime.auth) return
      try {
        await runtime.sync.syncNow().catch(() => {})
        await runtime.auth.signOut()
        pushNotice({ kind: 'buy', title: 'Déconnecté', detail: 'Votre progression reste sur cet appareil.' })
      } catch {
        sayError('La déconnexion a échoué.')
      }
    },

    async syncNow() {
      if (!runtime.sync?.uid) return
      try {
        const result = await runtime.sync.syncNow()
        if (result.action === 'ask') set({ conflict: result.conflict, dialog: 'conflict' })
      } catch {
        /* shown by the status */
      }
    },

    async refresh() {
      if (!runtime.sync?.uid) return
      try {
        const result = await runtime.sync.refresh()
        if (result.action === 'ask') set({ conflict: result.conflict, dialog: 'conflict' })
      } catch {
        /* shown by the status */
      }
    },

    /** The player's answer to a conflict: 'device' or 'account'. */
    async resolveConflict(choice) {
      const { conflict } = get()
      if (!conflict) return
      try {
        await runtime.sync.resolve(choice, conflict)
        set({ conflict: null, dialog: runtime.sync.pseudo ? null : 'pseudo' })
        get().checkReward()
      } catch {
        sayError('La synchronisation a échoué. Réessayez.')
      }
    },

    /** Claims a pseudo; resolves to an error message, or null when done. */
    async choosePseudo(name) {
      try {
        const pseudo = await runtime.sync.choosePseudo(name)
        set({ pseudo, dialog: null })
        get().loadBoard()
        return null
      } catch (error) {
        if (error instanceof PseudoTakenError) return 'Ce pseudo est déjà pris.'
        if (error.message === 'invalid-pseudo') return '3 à 16 caractères : lettres, chiffres, - ou _.'
        console.error(error)
        return 'Impossible d’enregistrer ce pseudo pour le moment.'
      }
    },

    async leaveLeaderboard() {
      try {
        await runtime.sync.leaveLeaderboard()
        set({ pseudo: null })
        get().loadBoard()
      } catch {
        sayError('Impossible de quitter le classement pour le moment.')
      }
    },

    /**
     * Loads a board: 'season' (this week, with the rival to overtake), 'daily'
     * (today's challenge), or all time: 'lp' (leagues), 'tokens', 'xp', 'bestMultiplier'.
     */
    async loadBoard(kind = get().board.kind) {
      if (!runtime.sync) return
      set({ board: { ...get().board, kind, loading: true, error: null } })
      try {
        if (kind === 'season') {
          const season = await runtime.sync.season(BOARD_SIZE)
          const week = usePoule.getState().week?.xp ?? 0
          const score = Math.max(week, season.mine?.score ?? 0)
          const rival = score > 0 ? await runtime.sync.rival(score).catch(() => null) : null
          set({ board: { kind, entries: season.entries, loading: false, error: null, season: { ...season, rival } } })
        } else if (kind === 'daily') {
          const daily = await runtime.sync.dailyBoard(BOARD_SIZE)
          set({ board: { kind, entries: daily.entries, loading: false, error: null, season: get().board.season, daily } })
        } else {
          const entries = await runtime.sync.leaderboard(kind, BOARD_SIZE)
          set({ board: { kind, entries, loading: false, error: null, season: get().board.season } })
        }
      } catch (error) {
        console.error(error)
        set({ board: { ...get().board, kind, entries: [], loading: false, error: 'Classement indisponible.' } })
      }
    },

    /** Looks for finished weeks and yesterday's challenge to settle; opens the results when there are some. */
    async checkReward() {
      if (!runtime.sync?.uid) return
      try {
        const pending = await runtime.sync.pendingResults()
        set({ pendingReward: pending })
        if (pending && !get().conflict) set({ dialog: 'reward' })
      } catch (error) {
        console.error(error)
      }
    },

    claimReward() {
      const pending = get().pendingReward
      if (!pending) return
      try {
        usePoule.getState().applyResults(() => runtime.sync.claimResults(pending))
        set({ pendingReward: null, dialog: null })
      } catch (error) {
        console.error(error)
        sayError('Impossible de récupérer la récompense. Terminez la partie en cours puis réessayez.')
      }
    },

    /** Opens another player's public profile (from a leaderboard row). */
    async openPlayer(uid, preview = {}) {
      set({ player: { uid, loading: Boolean(runtime.sync), error: null, profile: { uid, ...preview } } })
      if (!runtime.sync) return
      try {
        const profile = await runtime.sync.profileOf(uid)
        if (get().player?.uid !== uid) return
        set({
          player: {
            uid,
            loading: false,
            error: profile ? null : 'Profil introuvable.',
            profile: profile ?? { uid, ...preview },
          },
        })
      } catch (error) {
        console.error(error)
        if (get().player?.uid === uid)
          set({ player: { ...get().player, loading: false, error: 'Profil indisponible.' } })
      }
    },

    closePlayer: () => set({ player: null }),

    /** Admin stats screen: reads every save and counts (domain/adminStats.js). */
    async loadAdmin() {
      if (!runtime.sync?.uid) return
      set({ admin: { ...get().admin, status: 'loading', error: null } })
      try {
        const overview = await runtime.sync.adminOverview()
        const stats = computeAdminStats({ ...overview, now: Date.now() })
        set({ admin: { status: 'ready', stats, error: null } })
      } catch (error) {
        console.error(error)
        const denied = error?.code === 'permission-denied'
        set({
          admin: {
            ...get().admin,
            status: 'error',
            error: denied ? 'Accès refusé : ce compte n’est pas administrateur.' : 'Statistiques indisponibles.',
          },
        })
      }
    },

    openDialog: (dialog) => set({ dialog }),
    closeDialog: () => set((state) => ({ dialog: state.dialog === 'conflict' ? 'conflict' : null })),

    /** Board for signed-out visitors too: loads once Firebase is ready. */
    ready: () => runtime.sync !== null,
  }
})
