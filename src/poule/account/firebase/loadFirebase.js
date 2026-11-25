import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from './config.js'

/**
 * The Firebase SDK is loaded from Google's CDN when the game starts, as ES
 * modules, pinned to one version, the same way as sql.js: it is not an npm
 * dependency, and the portfolio pages never load it. To bundle it instead,
 * install `firebase` and import from 'firebase/app', 'firebase/auth' and
 * 'firebase/firestore' here; nothing else changes.
 */
const BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/`
const load = (name) => import(/* @vite-ignore */ `${BASE}firebase-${name}.js`)

let pending = null

/** Resolves to { auth, db, authSdk, firestoreSdk } once, or rejects if accounts are off or the CDN fails. */
export function loadFirebase() {
  if (!FIREBASE_CONFIG) return Promise.reject(new Error('Accounts are turned off (no Firebase config)'))
  pending ??= (async () => {
    const [app, auth, firestore, functions] = await Promise.all([
      load('app'),
      load('auth'),
      load('firestore'),
      load('functions'),
    ])
    const firebaseApp = app.initializeApp(FIREBASE_CONFIG)
    return {
      auth: auth.getAuth(firebaseApp),
      db: firestore.getFirestore(firebaseApp),
      authSdk: auth,
      firestoreSdk: firestore,
      functions: functions.getFunctions(firebaseApp, 'europe-west1'),
      functionsSdk: functions,
    }
  })().catch((error) => {
    pending = null
    throw error
  })
  return pending
}

export const accountsEnabled = () => Boolean(FIREBASE_CONFIG)
