import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AUTOCASH_TARGETS, SLOTS, UPGRADES, WHITE_PLUMAGE, upgradeById } from '../../config/upgrades.js'
import { purchaseCheck } from '../../domain/progression.js'
import { usePoule } from '../../state/usePoule.js'
import { count, multiplierLabel } from '../format.js'
import { FeatherIcon, LockIcon } from '../icons.jsx'
import { HenSprite } from '../road/sprites.jsx'
import './shop.css'

/** The hen as she would look with this upgrade on top of what she wears. */
function Preview({ upgrade, equipped }) {
  if (upgrade.slot === 'perk' || upgrade.slot === 'trail') {
    return <div className={`shop__preview shop__preview--${upgrade.id}`} aria-hidden="true" />
  }
  const plumage = upgradeById(upgrade.slot === 'plumage' ? upgrade.id : equipped.plumage)
  return (
    <div className="shop__preview">
      <HenSprite
        plumage={plumage ? { color: plumage.color, shade: plumage.shade } : WHITE_PLUMAGE}
        hat={upgrade.slot === 'hat' ? upgrade.id : (equipped.hat ?? null)}
      />
    </div>
  )
}

function AutocashSetting() {
  const target = usePoule((state) => state.autocashTarget)
  const setAutocash = usePoule((state) => state.setAutocash)
  return (
    <label className="shop__setting">
      Encaisser à
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

function Item({ upgrade, progression, busy, buy, toggleEquip }) {
  const owned = progression.owned.includes(upgrade.id)
  const worn = progression.equipped[upgrade.slot] === upgrade.id
  const verdict = purchaseCheck(upgrade.id, progression)

  let action
  if (!owned) {
    const reason =
      verdict === 'level'
        ? `Niveau ${upgrade.level} requis`
        : verdict === 'feathers'
          ? `Il manque ${count(upgrade.cost - progression.feathers)} plumes`
          : null
    action = (
      <button type="button" className="shop__buy" disabled={verdict !== 'ok' || busy} onClick={() => buy(upgrade.id)}>
        {verdict === 'level' && <LockIcon />} {reason ?? 'Acheter'}
      </button>
    )
  } else if (upgrade.slot === 'perk') {
    action = upgrade.id === 'autocash' ? <AutocashSetting /> : <span className="shop__active">Actif</span>
  } else {
    action = (
      <button type="button" aria-pressed={worn} onClick={() => toggleEquip(upgrade.id)}>
        {worn ? 'Retirer' : 'Porter'}
      </button>
    )
  }

  return (
    <li className={`shop__item${owned ? ' shop__item--owned' : ''}${worn ? ' shop__item--worn' : ''}`}>
      <Preview upgrade={upgrade} equipped={progression.equipped} />
      <div className="shop__info">
        <b>{upgrade.label}</b>
        {upgrade.description && <small>{upgrade.description}</small>}
        {!owned && (
          <span className="shop__price">
            <FeatherIcon size={14} /> {count(upgrade.cost)}
          </span>
        )}
      </div>
      {action}
    </li>
  )
}

/** The hen house: upgrades bought with feathers, by slot. */
export default function ShopPanel() {
  const [slot, setSlot] = useState(SLOTS[0].id)
  const { progression, busy, buy, toggleEquip } = usePoule(
    useShallow((state) => ({
      progression: state.progression,
      busy: state.busy,
      buy: state.buy,
      toggleEquip: state.toggleEquip,
    })),
  )
  if (!progression) return null
  const items = UPGRADES.filter((upgrade) => upgrade.slot === slot)

  return (
    <section className="box shop" aria-labelledby="shop-title">
      <div className="shop__head">
        <h2 id="shop-title">Le poulailler</h2>
        <p className="box__note">
          Chaque voie franchie rapporte des plumes, même si la poule se fait écraser. Les améliorations changent son
          allure, pas ses chances.
        </p>
      </div>
      <div className="shop__tabs" role="tablist" aria-label="Catégories">
        {SLOTS.map((entry) => (
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
      <ul className="shop__list" role="tabpanel">
        {items.map((upgrade) => (
          <Item
            key={upgrade.id}
            upgrade={upgrade}
            progression={progression}
            busy={busy}
            buy={buy}
            toggleEquip={toggleEquip}
          />
        ))}
      </ul>
    </section>
  )
}
