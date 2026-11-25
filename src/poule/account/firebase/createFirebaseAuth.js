import { isNativeApp, nativePlugin } from '../../platform.js'

/**
 * Sign-in with Google through Firebase Authentication. A popup is used: it
 * works on a site hosted outside Firebase (GitHub Pages) where the redirect
 * flow is blocked by browsers' third-party storage rules.
 */
export function createFirebaseAuth({ auth, authSdk }) {
  const {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signInWithCredential,
    signOut,
    setPersistence,
    browserLocalPersistence,
  } = authSdk
  // Android app: Google's own sign-in sheet (native plugin) gives an ID
  // token, which signs in to Firebase here like the popup does on the web.
  const native = isNativeApp() ? nativePlugin('FirebaseAuthentication') : null

  const toUser = (user) =>
    user && {
      uid: user.uid,
      name: user.displayName ?? 'Joueur',
      email: user.email ?? null,
      photo: user.photoURL ?? null,
    }

  return {
    /** Calls `listener` with the signed-in user (or null) now and on every change. */
    onUserChanged(listener) {
      return onAuthStateChanged(auth, (user) => listener(toUser(user)))
    },

    async signIn() {
      if (native) {
        const result = await native.signInWithGoogle({ skipNativeAuth: true })
        const idToken = result?.credential?.idToken
        if (!idToken) throw Object.assign(new Error('No Google token'), { code: 'auth/user-cancelled' })
        const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
        return toUser(user)
      }
      await setPersistence(auth, browserLocalPersistence)
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const { user } = await signInWithPopup(auth, provider)
      return toUser(user)
    },

    async signOut() {
      await native?.signOut().catch(() => {})
      await signOut(auth)
    },
  }
}

/** A sign-in error in words a player understands, or null to stay quiet. */
export function describeAuthError(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null
    case 'auth/popup-blocked':
      return 'Le navigateur a bloqué la fenêtre de connexion. Autorisez les pop-ups pour ce site, puis réessayez.'
    case 'auth/network-request-failed':
      return 'Pas de connexion réseau. Réessayez dans un instant.'
    case 'auth/unauthorized-domain':
      return 'Ce site n’est pas autorisé à se connecter à ce projet Firebase.'
    default:
      return 'La connexion a échoué. Réessayez.'
  }
}
