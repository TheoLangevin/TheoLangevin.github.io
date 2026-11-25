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
      costs: [t(1000), t(2500), t(5000), t(9000), t(15000)],
    },
    {
      id: 'golden-beak',
      icon: '🪙',
      label: 'Bec d’or',
      effect: (level) => `+${level} % sur chaque encaissement`,
      costs: [t(2000), t(4000), t(8000), t(14000), t(22000)],
    },
    {
      id: 'insurance',
      icon: '🛡️',
      label: 'Assurance',
      effect: (level) => `${level * 8} % de la mise rendus si la poule se fait écraser`,
      costs: [t(1500), t(3500), t(7000), t(12000), t(20000)],
    },
    {
      id: 'second-wind',
      icon: '🔋',
      label: 'Second souffle',
      effect: (level) => `Recharge de jetons +${level * 50} %`,
      costs: [t(500), t(1500), t(3000)],
    },
  ].map((talent) => Object.freeze({ ...talent, max: talent.costs.length })),
)

export const talentById = (id) => TALENTS.find((talent) => talent.id === id) ?? null
