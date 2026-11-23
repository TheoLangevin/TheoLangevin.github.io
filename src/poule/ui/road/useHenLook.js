import { useMemo } from 'react'
import { upgradeById, WHITE_PLUMAGE } from '../../config/upgrades.js'
import { usePoule } from '../../state/usePoule.js'

const NOTHING = {}

/** What the hen wears, from the upgrades equipped in the database. */
export function useHenLook() {
  const equipped = usePoule((state) => state.progression?.equipped ?? NOTHING)
  const owned = usePoule((state) => state.progression?.owned)
  return useMemo(() => {
    const plumage = upgradeById(equipped.plumage)
    return {
      hat: equipped.hat ?? null,
      plumage: plumage ? { color: plumage.color, shade: plumage.shade } : WHITE_PLUMAGE,
      trail: equipped.trail ?? null,
      fast: Boolean(owned?.includes('turbo')),
    }
  }, [equipped, owned])
}
