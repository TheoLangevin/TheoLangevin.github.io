/**
 * The only account that may open the stats screen (poule/#admin). The screen
 * hides itself for anyone else, but the real lock is firestore.rules: only
 * this verified Google address can read other players' saves.
 */
export const ADMIN_EMAIL = 'theolangevin3@gmail.com'

/** Most players the stats screen loads. */
export const ADMIN_MAX_PLAYERS = 2000
