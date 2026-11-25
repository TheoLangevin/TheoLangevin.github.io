import { useShallow } from 'zustand/react/shallow'
import { BOX_PRICE, RARITIES } from '../../config/collection.js'
import { upgradeById } from '../../config/upgrades.js'
import { boxPool, rarityOf } from '../../domain/collection.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { count, percent, tokens } from '../format.js'
import { CoinIcon } from '../icons.jsx'
import Mannequin from '../road/Mannequin.jsx'

/** The surprise box: price, odds shown, and what it gave. */
export function SurpriseBox() {
  const s = usePoule(
    useShallow((state) => ({
      owned: state.progression?.owned,
      balance: state.balanceCents,
      inRound: Boolean(state.round),
      result: state.boxResult,
      open: state.openBox,
      close: state.closeBox,
    })),
  )
  if (!s.owned) return null
  const pool = boxPool(s.owned)
  const left = RARITIES.filter((rarity) => pool.some((item) => rarityOf(item).id === rarity.id))
  const total = left.reduce((sum, rarity) => sum + rarity.chance, 0)
  return (
    <section className="box card">
      <div className="box__head">
        <span className="box__icon" aria-hidden="true">
          🎁
        </span>
        <div>
          <b>Boîte surprise</b>
          <small className="muted">Un objet que vous n’avez pas encore, au hasard.</small>
        </div>
      </div>
      <p className="box__odds">
        {left.map((rarity) => `${rarity.label} ${percent(rarity.chance / total)}`).join(' · ') || 'Collection complète !'}
      </p>
      <button
        type="button"
        className="big big--buy"
        disabled={pool.length === 0 || s.balance < BOX_PRICE || s.inRound}
        onClick={s.open}
      >
        Ouvrir la boîte <small>{tokens(BOX_PRICE)} jetons</small>
      </button>
      {s.result && (
        <Dialog
          title={`${rarityOf(s.result).label} !`}
          onClose={s.close}
          actions={
            <button type="button" className="big big--play" onClick={s.close}>
              Super !
            </button>
          }
        >
          <div className="box__result">
            <Mannequin equipped={{ [s.result.slot]: s.result.id }} size="large" />
            <p>
              <b>{s.result.label}</b> rejoint votre collection (déjà équipé).
            </p>
          </div>
        </Dialog>
      )}
    </section>
  )
}

/** Album: completion and sets, on the profile. */
export function CollectionAlbum() {
  const { collection, claimSet } = usePoule(
    useShallow((state) => ({ collection: state.collection, claimSet: state.claimSet })),
  )
  if (!collection) return null
  return (
    <section className="card album">
      <div className="album__total">
        <b>
          {count(collection.owned)} / {count(collection.total)}
        </b>
        <span className="missions__bar">
          <i style={{ width: `${(collection.owned / collection.total) * 100}%` }} />
        </span>
        <small className="muted">{percent(collection.owned / collection.total)} de la collection</small>
      </div>
      <ul className="missions">
        {collection.sets.map((set) => {
          const done = set.have === set.items.length
          return (
            <li key={set.id} className={set.claimed ? 'is-claimed' : undefined}>
              <div>
                <b>Série {set.label}</b>
                <small>{set.items.map((id) => upgradeById(id)?.label).join(' · ')}</small>
                <span className="missions__bar">
                  <i style={{ width: `${(set.have / set.items.length) * 100}%` }} />
                </span>
              </div>
              {set.claimed ? (
                <span className="missions__done">✓</span>
              ) : (
                <button type="button" disabled={!done} onClick={() => claimSet(set.id)}>
                  <CoinIcon size={14} /> {tokens(set.reward)}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
