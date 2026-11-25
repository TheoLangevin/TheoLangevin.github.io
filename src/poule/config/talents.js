/**
 * Talents: permanent upgrades of the hen, bought with tokens, level by level.
 * They never touch the odds of a lane (the draw stays the one the mode
 * shows): they add to what a round gives. Daily challenge, tournament and duel
 * rounds are played without them, so those stay equal for everyone.
 */

const t = (tokens) => tokens * 100

export const TALENTS = Object.freeze(
  [
    {
      id: 'instinct',
      icon: '🧠',
      label: 'Instinct',
      effect: (level) => `+${level * 5} % d’XP par partie`,
      costs: [t(10000), t(25000), t(50000), t(100000), t(200000)],
    },
    {
      id: 'golden-beak',
      icon: '🪙',
      label: 'Bec d’or',
      effect: (level) => `+${level} % sur chaque encaissement`,
      costs: [t(20000), t(50000), t(100000), t(200000), t(400000)],
    },
    {
      id: 'insurance',
      icon: '🛡️',
      label: 'Assurance',
      effect: (level) => `${level * 8} % de la mise rendus si la poule se fait écraser`,
      costs: [t(15000), t(35000), t(75000), t(150000), t(300000)],
    },
    {
      id: 'second-wind',
      icon: '🔋',
      label: 'Second souffle',
      effect: (level) => `Recharge de jetons +${level * 50} %`,
      costs: [t(5000), t(15000), t(40000)],
    },
  ].map((talent) => Object.freeze({ ...talent, max: talent.costs.length })),
)

export const talentById = (id) => TALENTS.find((talent) => talent.id === id) ?? null
