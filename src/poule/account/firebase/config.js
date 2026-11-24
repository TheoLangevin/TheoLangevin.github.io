/**
 * Firebase project of the game (console: https://console.firebase.google.com/project/la-poule-traverse).
 * These values identify the project to Google; they are public by design and
 * ship in every page. What protects the data is firestore.rules, at the root
 * of the repository. Set FIREBASE_CONFIG to null to turn accounts off.
 */
export const FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyALO2pnTNwcT_vzDVgJ3NxEOxtoelTXAUg',
  authDomain: 'la-poule-traverse.firebaseapp.com',
  projectId: 'la-poule-traverse',
  storageBucket: 'la-poule-traverse.firebasestorage.app',
  messagingSenderId: '621621776666',
  appId: '1:621621776666:web:7340c60d2a2fe39cdb9ca3',
})

/** Firebase JS SDK served by Google's CDN, pinned. */
export const FIREBASE_SDK_VERSION = '13.2.0'
