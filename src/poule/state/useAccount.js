import { create } from 'zustand'
import { PseudoTakenError } from '../account/cloud.js'
import { createSyncService } from '../account/createSyncService.js'
import { createFirebaseAuth, describeAuthError } from '../account/firebase/createFirebaseAuth.js'
import { createFirestoreCloud } from '../account/firebase/createFirestoreCloud.js'
import { accountsEnabled, loadFirebase } from '../account/firebase/loadFirebase.js'
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
      set({ status: 'signedOut', user: null, pseudo: null, conflict: null, dialog: null })
      return
    }
    set({ status: 'signedIn', user })
    try {
      const result = await runtime.sync.connect(user)
      set({ pseudo: runtime.sync.pseudo })
      if (result.action === 'ask') set({ conflict: result.conflict, dialog: 'conflict' })
      else if (!runtime.sync.pseudo) set({ dialog: 'pseudo' })
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
    leaderboard: { by: 'xp', entries: [], loading: false, error: null },

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
      } catch {
        sayError('La synchronisation a échoué. Réessayez.')
      }
    },

    /** Claims a pseudo; resolves to an error message, or null when done. */
    async choosePseudo(name) {
      try {
        const pseudo = await runtime.sync.choosePseudo(name)
        set({ pseudo, dialog: null })
        get().loadLeaderboard(get().leaderboard.by)
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
        get().loadLeaderboard(get().leaderboard.by)
      } catch {
        sayError('Impossible de quitter le classement pour le moment.')
      }
    },

    async loadLeaderboard(by = 'xp') {
      if (!runtime.sync) return
      set({ leaderboard: { ...get().leaderboard, by, loading: true, error: null } })
      try {
        const entries = await runtime.sync.leaderboard(by)
        set({ leaderboard: { by, entries, loading: false, error: null } })
      } catch (error) {
        console.error(error)
        set({ leaderboard: { by, entries: [], loading: false, error: 'Classement indisponible.' } })
      }
    },

    openDialog: (dialog) => set({ dialog }),
    closeDialog: () => set((state) => ({ dialog: state.dialog === 'conflict' ? 'conflict' : null })),
  }
})
