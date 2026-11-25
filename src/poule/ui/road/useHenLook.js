import { useMemo } from 'react'
import { DEFAULT_CONFETTI, upgradeById, WHITE_PLUMAGE } from '../../config/upgrades.js'
import { usePoule } from '../../state/usePoule.js'

const NOTHING = {}

/** What the hen, the road and the party look like, from an `equipped` map. */
export function lookFrom(equipped = NOTHING, owned = []) {
  const plumage = upgradeById(equipped.plumage)
  return {
    colors: plumage?.colors ?? [WHITE_PLUMAGE.color, WHITE_PLUMAGE.shade],
    hat: equipped.hat ?? null,
    neck: equipped.neck ?? null,
    trail: upgradeById(equipped.trail)?.trail ?? null,
    road: equipped.road ?? null,
    confetti: upgradeById(equipped.party)?.colors ?? DEFAULT_CONFETTI,
    title: upgradeById(equipped.title)?.label ?? null,
    fast: owned.includes('turbo'),
    skin: upgradeById(equipped.skin)?.skin ?? null,
  }
}

/** The look of the player's hen, from the items equipped in the database. */
export function useHenLook() {
  const equipped = usePoule((state) => state.progression?.equipped ?? NOTHING)
  const owned = usePoule((state) => state.progression?.owned)
  return useMemo(() => lookFrom(equipped, owned ?? []), [equipped, owned])
}
