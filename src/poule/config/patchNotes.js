/**
 * What changed, newest first. The app shows the notes the player has not
 * seen yet once, after an update; all of them stay in Profil → Nouveautés.
 * Add an entry at the top with each update players can notice.
 */
export const PATCH_NOTES = Object.freeze([
  {
    id: '2026-11-26-scene',
    date: '26 nov. 2026',
    title: 'Un vrai poulailler',
    items: [
      'Chaque bâtiment acheté apparaît dans la cour du poulailler.',
      'Les bâtiments ont des niveaux : bois, bronze, argent, or puis diamant, à 50, 100, 200 et 400 exemplaires.',
      'Tes poules spéciales installées au perchoir se promènent dans la cour.',
      'Ce journal des nouveautés, aussi dans Profil.',
    ],
  },
  {
    id: '2026-11-26-coop',
    date: '26 nov. 2026',
    title: 'Le Poulailler',
    items: [
      'Nouvel onglet : touche la poule pour pondre des œufs, achète des bâtiments qui pondent pour toi.',
      'Tout se débloque petit à petit : améliorations, trophées, œuf doré, poules spéciales, marché, looks, déménagement.',
      '12 poules spéciales, de commune à légendaire, avec 5 niveaux chacune.',
      'Le marché aux œufs rachète jusqu’à 800 jetons par jour.',
      'Les équipes deviennent les Familles poule, menées par leur papa poule.',
    ],
  },
  {
    id: '2026-11-25-features',
    date: '25 nov. 2026',
    title: 'Ligues du jour, talents et pass',
    items: [
      'Les ligues se règlent chaque jour à minuit (UTC).',
      'Talents dans la Boutique : Instinct, Bec d’or, Assurance, Second souffle.',
      'Pass de saison : 30 paliers, des jetons et des objets exclusifs.',
      'Tournoi du week-end : 5 essais, mêmes routes pour tous, récompenses ×3.',
      'Nouveaux sons, musique d’ambiance et vibrations.',
    ],
  },
])

export const LATEST_NOTES = PATCH_NOTES[0].id
