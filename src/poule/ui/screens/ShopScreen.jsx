import { useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AUTOCASH_TARGETS, SLOTS, UPGRADES, upgradeById } from '../../config/upgrades.js'
import { purchaseCheck } from '../../domain/progression.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { count, multiplierLabel, tokens } from '../format.js'
import { BoltIcon, CoinIcon, GiftIcon, LockIcon } from '../icons.jsx'
import { CarSprite, HenSprite } from '../road/sprites.jsx'
import Mannequin from '../road/Mannequin.jsx'
import { SurpriseBox } from '../collection/Collection.jsx'
import Talents from '../progress/Talents.jsx'
import { isEventActive } from '../../domain/calendar.js'
import './shop.css'

const NOTHING = {}

/** Price of an item, with its currency. */
export function Price({ item }) {
  if (item.exclusive) {
    return (
      <span className="price price--exclusive">
        <GiftIcon size={14} /> {item.beta ? 'Bêta' : 'Saison'}
      </span>
    )
  }
  return (
    <span className="price">
      <CoinIcon size={15} /> {tokens(item.cost)}
    </span>
  )
}

/** What an item looks like, on its own card. */
function Thumb({ item, equipped }) {
  if (item.slot === 'perk') {
    return (
      <div className="thumb thumb--perk" aria-hidden="true">
        <BoltIcon size={34} />
      </div>
    )
  }
  if (item.slot === 'party') {
    return (
      <div className="thumb thumb--party" aria-hidden="true">
        {item.colors.map((color, index) => (
          <i key={color} style={{ background: color, '--r': `${index * 37 - 40}deg`, '--x': `${18 + index * 18}%` }} />
        ))}
      </div>
    )
  }
  if (item.slot === 'title') {
    return (
      <div className="thumb thumb--title" aria-hidden="true">
        <span>{item.label}</span>
      </div>
    )
  }
  if (item.slot === 'road') {
    return (
      <div className="thumb thumb--road road-swatch" data-road={item.id} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    )
  }
  if (item.slot === 'skin') {
    return (
      <div className="thumb thumb--skin road-swatch" aria-hidden="true">
        <HenSprite skin={item.skin} neck={equipped.neck ?? null} />
        <CarSprite skin={item.skin} />
      </div>
    )
  }
  // Hats, neck, plumage and trails: the hen wearing it, over what she has on.
  return <Mannequin equipped={{ ...equipped, [item.slot]: item.id }} />
}

function stateOf(item, progression) {
  if (progression.owned.includes(item.id)) {
    if (item.slot === 'perk') return 'active'
    return progression.equipped[item.slot] === item.id ? 'worn' : 'owned'
  }
  return purchaseCheck(item.id, progression)
}

const STATE_LABEL = { worn: 'Porté', owned: 'Possédé', active: 'Actif' }

function ItemCard({ item, progression, onOpen }) {
  const state = stateOf(item, progression)
  return (
    <li>
      <button type="button" className={`item item--${state}`} onClick={() => onOpen(item.id)}>
        <Thumb item={item} equipped={progression.equipped} />
        <span className="item__name">{item.label}</span>
        <span className="item__foot">
          {STATE_LABEL[state] ? (
            <span className={`item__state item__state--${state}`}>{STATE_LABEL[state]}</span>
          ) : state === 'level' ? (
            <span className="item__state">
              <LockIcon /> Niv. {item.level}
            </span>
          ) : (
            <Price item={item} />
          )}
        </span>
      </button>
    </li>
  )
}

function AutocashSetting() {
  const target = usePoule((state) => state.autocashTarget)
  const setAutocash = usePoule((state) => state.setAutocash)
  return (
    <label className="sheet__setting">
      Encaisser automatiquement à
      <select value={target ?? ''} onChange={(event) => setAutocash(Number(event.target.value) || null)}>
        <option value="">jamais (désactivé)</option>
        {AUTOCASH_TARGETS.map((value) => (
          <option key={value} value={value}>
            {multiplierLabel(value)}
          </option>
        ))}
      </select>
    </label>
  )
}

const REASON = {
  level: (item) => `Niveau ${item.level} requis`,
  tokens: () => 'Pas assez de jetons',
  exclusive: () => 'Récompense de saison',
  limited: () => 'Édition limitée terminée',
}

/** Bottom sheet of one item: big preview, then buy, wear or take off. */
function ItemSheet({ id, onClose }) {
  const s = usePoule(
    useShallow((state) => ({
      progression: state.progression,
      balanceCents: state.balanceCents,
      inRound: Boolean(state.round),
      busy: state.busy,
      buy: state.buy,
      toggleEquip: state.toggleEquip,
    })),
  )
  const item = upgradeById(id)
  const progression = { ...s.progression, balanceCents: s.balanceCents }
  const state = stateOf(item, progression)
  const owned = s.progression.owned.includes(id)
  const preview = item.slot === 'perk' || item.slot === 'party' ? null : { ...s.progression.equipped, [item.slot]: id }
  const roundBlocks = item.currency === 'tokens' && s.inRound

  // Buttons go in the sheet's pinned footer, always in reach of the thumb.
  let actions = null
  if (!owned && !item.exclusive) {
    actions = (
      <>
        {roundBlocks && <p className="note">Terminez la partie en cours pour dépenser des jetons.</p>}
        {item.currency === 'tokens' && state === 'ok' && !roundBlocks && (
          <p className="note">Il vous restera {tokens(s.balanceCents - item.cost)} jetons.</p>
        )}
        <button
          type="button"
          className="big big--buy"
          disabled={state !== 'ok' || s.busy || roundBlocks}
          onClick={() => s.buy(id)}
        >
          {state === 'ok' ? 'Acheter' : REASON[state]?.(item)}
          <small>
            <Price item={item} />
          </small>
        </button>
      </>
    )
  } else if (owned && item.slot !== 'perk') {
    actions = (
      <button type="button" className="big big--wear" onClick={() => s.toggleEquip(id)}>
        {state === 'worn' ? 'Retirer' : 'Porter'}
      </button>
    )
  }

  return (
    <Dialog title={item.label} onClose={onClose} actions={actions}>
      {preview ? (
        <Mannequin equipped={preview} size="large" />
      ) : (
        <Thumb item={item} equipped={s.progression.equipped} />
      )}
      {item.description && <p>{item.description}</p>}
      {item.limited && <p className="note">Édition limitée : en vente seulement pendant l’événement.</p>}
      {item.exclusive && item.pass && <p>Se gagne avec le pass de saison (Profil).</p>}
      {item.exclusive && !item.beta && !item.pass && <p>Se gagne en finissant bien classé une journée de ligue ou un tournoi. Voir le classement.</p>}
      {item.beta && !owned && <p className="note">Réservé aux joueurs de la bêta : il ne s’achète pas.</p>}
      {item.secret && !owned && <p className="shop__secret">Vous avez trouvé l’objet caché de la boutique.</p>}
      {owned &&
        item.slot === 'perk' &&
        (item.id === 'autocash' ? <AutocashSetting /> : <p className="note">Atout actif.</p>)}
    </Dialog>
  )
}

export default function ShopScreen({ hidden }) {
  const [slot, setSlot] = useState('all')
  const [open, setOpen] = useState(null)
  const { progression, balanceCents } = usePoule(
    useShallow((state) => ({ progression: state.progression, balanceCents: state.balanceCents })),
  )
  const shop = useMemo(() => (progression ? { ...progression, balanceCents } : null), [progression, balanceCents])
  const owned = progression?.owned
  // Secret items show up once owned; season rewards only in their own slot.
  const items = useMemo(
    () =>
      UPGRADES.filter((item) => (slot === 'all' ? !item.exclusive : item.slot === slot)).filter(
        (item) =>
          (!item.secret || owned?.includes(item.id)) &&
          (!item.limited || isEventActive(item.limited) || owned?.includes(item.id)),
      ),
    [slot, owned],
  )
  const [taps, setTaps] = useState(0)
  const tapTimer = useRef(null)

  // The hidden item: tap the hen in the dressing room five times in a row.
  function tapHen() {
    clearTimeout(tapTimer.current)
    const next = taps + 1
    if (next >= 5) {
      setTaps(0)
      setOpen('cone')
      return
    }
    setTaps(next)
    tapTimer.current = setTimeout(() => setTaps(0), 1500)
  }
  const listed = UPGRADES.filter((item) => !item.secret && (!item.limited || isEventActive(item.limited)))
  if (!shop) return <main className="screen" hidden={hidden} aria-busy="true" />

  return (
    <main className="screen screen--shop" hidden={hidden}>
      <div className="shop__hero card">
        <button
          type="button"
          className="shop__hen"
          data-taps={taps}
          onClick={tapHen}
          aria-label="La poule de la cabine d’essayage"
        >
          {/* A new key on each tap replays the wobble. */}
          <Mannequin key={taps} equipped={shop.equipped ?? NOTHING} />
        </button>
        <div className="shop__hero-text">
          <h1 className="screen__title">Boutique</h1>
          <p className="muted">
            {count(listed.length)} objets, tous en jetons. Aucun ne change vos chances.
            {taps >= 3 && <span className="shop__whisper"> Encore…</span>}
          </p>
        </div>
      </div>

      <Talents />

      <SurpriseBox />

      <div className="chips shop__tabs" role="tablist" aria-label="Catégories">
        {[{ id: 'all', label: 'Tout' }, ...SLOTS].map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={slot === entry.id}
            onClick={() => setSlot(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <ul className="shop__grid" role="tabpanel">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} progression={shop} onOpen={setOpen} />
        ))}
      </ul>
      {open && <ItemSheet id={open} onClose={() => setOpen(null)} />}
    </main>
  )
}
