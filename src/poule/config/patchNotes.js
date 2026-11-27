/**
 * What changed, newest first. The app shows the notes the player has not
 * seen yet once, after an update; all of them stay in Profil → Nouveautés.
 * Add an entry at the top with each update players can notice.
 */
export const PATCH_NOTES = Object.freeze([
  {
    id: '2026-11-27-fair',
    date: '27 nov. 2026',
    title: 'Poulailler sans bots',
    items: [
      'Au plus 20 touchers comptés par seconde, et les rythmes trop réguliers (auto-clickers) ne comptent plus.',
      'Après 2 minutes à tapoter sans pause, la poule fatigue et pond moins à chaque toucher ; une pause de 5 s et c’est reparti.',
    ],
  },
  {
    id: '2026-11-27-hens',
    date: '27 nov. 2026',
    title: '20 nouvelles poules et rééquilibrage',
    items: [
      '20 nouvelles poules spéciales (32 en tout) : poules des mondes, Meneuse, Déménageuse, Phénix, Licorne, Reine des mondes, Oracle…',
      'Nouveaux bonus : commandes, calendrier, pluie d’œufs, couveuse, mondes, trophées, plumes d’or, installation après un déménagement.',
      'Œuf doré rééquilibré : il passe moins souvent, la frénésie est ×3 pendant 20 s et la pluie d’œufs plus petite.',
      'Couveuse : plus chère à chaque poule et à chaque niveau obtenus ; un doublon au maximum rapporte moins.',
      'Bonus des poules réduits : niveaux (+25 % par niveau), collections (+3 à +12 %) et quelques poules trop fortes.',
    ],
  },
  {
    id: '2026-11-27-move',
    date: '27 nov. 2026',
    title: 'Déménagement réparé',
    items: [
      'Corrigé : le Poulailler ne se sauvegardait plus depuis ce matin, ce qui annulait les déménagements et bloquait le marché.',
      'Après un déménagement, tes poules spéciales doivent s’installer : leurs bonus (et ceux des collections) repartent de 0.',
      'Ils reviennent peu à peu, en entier quand le nouveau poulailler a pondu 10 % des œufs de l’ancien.',
    ],
  },
  {
    id: '2026-11-27-worlds',
    date: '27 nov. 2026',
    title: '5 nouveaux mondes',
    items: [
      'Ouvre des portails avec tes œufs : L’Île aux Coquillages 🏝️, Le Pôle Plumé 🏔️, Le Désert d’Or 🏜️, La Cité Mécanique 🏙️ et La Nébuleuse 🌌.',
      'Chaque monde a sa monnaie (coquillages, cristaux de givre, pépites, engrenages, poussières d’étoile), ses 6 bâtiments et son ambiance animée.',
      'Les usines boostent tout leur monde, et chaque monde booste les œufs de ta ferme pour toujours.',
      'Les mondes restent après un déménagement.',
      'Nouveau : la Boîte à idées (Profil) pour proposer la suite du jeu et voter pour les idées des autres.',
    ],
  },
  {
    id: '2026-11-27-goals',
    date: '27 nov. 2026',
    title: 'Objectifs du Poulailler',
    items: [
      'Calendrier de la ferme : une récompense chaque jour, de plus en plus grosse jusqu’au 7ᵉ jour.',
      'Commandes du fermier : 3 missions par jour, et un ticket de couveuse si tu fais les trois.',
      'Objectif de famille : les œufs de ta famille poule s’additionnent chaque semaine, chaque palier donne des tickets.',
      'Collections de poules : réunis toutes les poules d’une rareté pour un bonus permanent.',
      'Achat ×10, ×100 et Max pour les bâtiments.',
      'Classement des poulaillers (Classement → Poulailler) et statistiques dans Trophées.',
      'Gagner une partie à ×3 ou plus donne 20 s de frénésie au Poulailler.',
      'Dès le 1ᵉʳ décembre : Noël à la ferme, avec la neige, la Poule des Neiges et la Ferme enneigée.',
    ],
  },
  {
    id: '2026-11-26-estate',
    date: '26 nov. 2026',
    title: '25 bâtiments et le domaine',
    items: [
      '18 nouveaux bâtiments, de la Botte de paille à la Poule originelle : il y en a maintenant 25.',
      'Des nouveaux dès le début (paille, abreuvoir, cabane, verger, moulin…) et d’autres pour des mois de jeu.',
      'Le domaine : une bande à faire défiler sous la cour, avec tous tes bâtiments et ceux qui restent à découvrir.',
      'Les plumes d’or s’obtiennent plus lentement, pour que la progression dure.',
    ],
  },
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
