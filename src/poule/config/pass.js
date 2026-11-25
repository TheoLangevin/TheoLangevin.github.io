/**
 * The season pass: 30 tiers climbed with the experience (XP) earned during
 * the big season. Every tier pays tokens; some give an exclusive item. All
 * players have it, nothing to buy. It starts over with each big season.
 */

const t = (tokens) => tokens * 100

export const PASS_TIERS = 30
/** XP for each tier. */
export const PASS_XP_PER_TIER = 100

/** Exclusive items, by tier. */
export const PASS_ITEMS = Object.freeze({
  5: 'title-pass-regular',
  10: 'confetti-pass',
  15: 'trail-pass',
  20: 'title-pass-tireless',
  25: 'plumage-pass',
  30: 'plumage-pass-diamond',
})

/** Rewards of every tier, lowest first: { tier, xp, tokens, item }. */
export const PASS_REWARDS = Object.freeze(
  Array.from({ length: PASS_TIERS }, (_, index) => {
    const tier = index + 1
    return Object.freeze({
      tier,
      xp: tier * PASS_XP_PER_TIER,
      tokens: t(tier % 5 === 0 ? 300 + tier * 20 : 50 + tier * 10),
      item: PASS_ITEMS[tier] ?? null,
    })
  }),
)
