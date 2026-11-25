/**
 * Sign-in with Google through Firebase Authentication. A popup is used: it
 * works on a site hosted outside Firebase (GitHub Pages) where the redirect
 * flow is blocked by browsers' third-party storage rules.
 */
export function createFirebaseAuth({ auth, authSdk }) {
  const { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, setPersistence, browserLocalPersistence } =
    authSdk

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
      await setPersistence(auth, browserLocalPersistence)
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const { user } = await signInWithPopup(auth, provider)
      return toUser(user)
    },

    signOut: () => signOut(auth),
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
