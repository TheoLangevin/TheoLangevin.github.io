import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  BUILDINGS,
  COOP_SKINS,
  HEN_MAX_LEVEL,
  HEN_RARITIES,
  MILESTONES,
  PERKS,
  SPECIAL_HENS,
  TROPHIES,
  TROPHY_BONUS,
  FEATHER_BONUS,
  MARKET_DAILY_CAP,
  UNLOCKS,
} from '../../config/coop.js'
import * as rules from '../../domain/coop.js'
import { useCoop } from '../../state/useCoop.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { tokens } from '../format.js'
import { duration, eggs } from '../coop/format.js'
import Mannequin from '../road/Mannequin.jsx'
import './coop.css'

/** What each unlock opens, in the order a player meets them. */
const PARTS = [
  { id: 'upgrades', tab: 'Améliorations', hint: 'les améliorations' },
  { id: 'trophies', tab: 'Trophées', hint: 'les trophées' },
  { id: 'golden', tab: null, hint: 'l’œuf doré' },
  { id: 'hens', tab: 'Poules', hint: 'les poules spéciales' },
  { id: 'market', tab: 'Marché', hint: 'le marché aux œufs' },
  { id: 'skins', tab: 'Look', hint: 'le look du poulailler' },
  { id: 'prestige', tab: 'Déménager', hint: 'le déménagement' },
]
const RARITY = new Map(HEN_RARITIES.map((r) => [r.id, r]))

/** Le Poulailler: tap the hen, build the coop. Each part opens as the coop grows. */
export default function CoopScreen() {
  const { coop, open } = useCoop(useShallow((s) => ({ coop: s.coop, open: s.open })))
  const [tab, setTab] = useState('build')

  useEffect(() => {
    let close = null
    let gone = false
    open().then((stop) => (gone ? stop() : (close = stop)))
    return () => {
      gone = true
      close?.()
    }
  }, [open])

  if (!coop) return <main className="screen" aria-busy="true" />

  const tabs = [{ id: 'build', label: 'Bâtiments' }, ...PARTS.filter((p) => p.tab && rules.unlocked(coop, p.id)).map((p) => ({ id: p.id, label: p.tab }))]
  const next = PARTS.find((p) => !rules.unlocked(coop, p.id))

  return (
    <main className="screen screen--coop">
      <Stage coop={coop} />
      {next && (
        <div className="coop-next" aria-label="Prochaine nouveauté">
          <span>
            Bientôt : <b>{next.hint}</b>
          </span>
          <i style={{ '--ratio': Math.min(1, coop.lifetime / UNLOCKS[next.id]) }} />
        </div>
      )}
      {tabs.length > 1 && (
        <div className="chips coop-tabs" role="tablist" aria-label="Poulailler">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {tab === 'build' && <Buildings coop={coop} />}
      {tab === 'upgrades' && <Upgrades coop={coop} />}
      {tab === 'hens' && <Hens coop={coop} />}
      {tab === 'trophies' && <Trophies coop={coop} />}
      {tab === 'market' && <Market coop={coop} />}
      {tab === 'skins' && <Skins coop={coop} />}
      {tab === 'prestige' && <Prestige coop={coop} />}
      <Away />
    </main>
  )
}

/** The counter, the big hen and the golden egg. */
function Stage({ coop }) {
  const tap = useCoop((s) => s.tap)
  const golden = useCoop((s) => s.golden)
  const catchGolden = useCoop((s) => s.catchGolden)
  const equipped = usePoule((s) => s.equipped)
  const [floaters, setFloaters] = useState([])
  const [squash, setSquash] = useState(0)
  const stage = useRef(null)
  const now = Date.now()
  const frenzy = now < coop.frenzyUntil
  const skin = COOP_SKINS.find((s) => s.id === coop.skin.hen)
  const pps = rules.production(coop) * rules.eventMultiplier(coop, now)

  const onTap = (event) => {
    event.preventDefault()
    const { laid, lucky } = tap(1)
    const box = stage.current.getBoundingClientRect()
    const id = Math.random()
    setFloaters((list) => [...list.slice(-12), { id, x: event.clientX - box.left, y: event.clientY - box.top, laid, lucky }])
    setTimeout(() => setFloaters((list) => list.filter((f) => f.id !== id)), 900)
    setSquash((n) => n + 1)
  }

  return (
    <section ref={stage} className={`coop-stage coop-decor--${coop.skin.decor}${frenzy ? ' is-frenzy' : ''}`}>
      <div className="coop-count">
        <b>{eggs(coop.eggs)}</b> œufs
        <small>{pps > 0 ? `${eggs(pps)} par seconde` : 'Touche la poule pour pondre !'}</small>
        {frenzy && <span className="coop-frenzy">Frénésie ×7 · {Math.ceil((coop.frenzyUntil - now) / 1000)} s</span>}
      </div>
      <button
        type="button"
        className={`coop-hen coop-hen--${skin.id}`}
        key={squash % 2}
        onPointerDown={onTap}
        aria-label={`Pondre, ${eggs(rules.tapValue(coop, now))} œufs par toucher`}
      >
        <Mannequin equipped={equipped ?? {}} size="large" />
        {skin.accessory && <span className="coop-hen__accessory" aria-hidden="true">{skin.accessory}</span>}
      </button>
      {floaters.map((f) => (
        <span key={f.id} className={`coop-float${f.lucky ? ' is-lucky' : ''}`} style={{ left: f.x, top: f.y }} aria-hidden="true">
          +{eggs(f.laid)}
        </span>
      ))}
      {golden && (
        <button
          key={golden.id}
          type="button"
          className="coop-golden"
          style={{ left: `${golden.x}%`, top: `${golden.y}%` }}
          onPointerDown={catchGolden}
          aria-label="Attraper l’œuf doré"
        >
          🥚
        </button>
      )}
    </section>
  )
}

function Buy({ cost, have, onClick, label }) {
  return (
    <button type="button" className="coop-buy" disabled={have < cost} onClick={onClick} aria-label={label}>
      🥚 {eggs(cost)}
    </button>
  )
}

function Buildings({ coop }) {
  const buy = useCoop((s) => s.buyBuilding)
  const { shown, next } = rules.visibleBuildings(coop)
  const total = rules.production(coop) || 1
  return (
    <ul className="coop-list">
      {shown.map((b) => {
        const n = rules.owned(coop, b.id)
        const cost = rules.buildingCost(b.id, n)
        const pps = rules.buildingPps(coop, b.id) * rules.globalMultiplier(coop)
        const milestone = MILESTONES.find((m) => n < m)
        return (
          <li key={b.id} className="coop-row">
            <span className="coop-row__icon" aria-hidden="true">{b.icon}</span>
            <div className="coop-row__body">
              <b>
                {b.label} <small className="muted">×{n}</small>
              </b>
              <small>
                {n ? `${eggs(pps)}/s · ${Math.round((pps / total) * 100)} % du total` : `+${eggs(b.pps * rules.globalMultiplier(coop))} œufs/s chacun`}
              </small>
              {n > 0 && milestone && (
                <small className="muted">
                  À {milestone} : production doublée ({n}/{milestone})
                </small>
              )}
            </div>
            <Buy cost={cost} have={coop.eggs} onClick={() => buy(b.id)} label={`Acheter ${b.label}`} />
          </li>
        )
      })}
      {next && (
        <li className="coop-row is-mystery">
          <span className="coop-row__icon" aria-hidden="true">❔</span>
          <div className="coop-row__body">
            <b>???</b>
            <small className="muted">Se révèle à {eggs(next.cost * 0.5)} œufs en poche</small>
          </div>
        </li>
      )}
    </ul>
  )
}

function Upgrades({ coop }) {
  const buy = useCoop((s) => s.buyUpgrade)
  const list = rules.shopUpgrades(coop).slice(0, 8)
  if (!list.length) return <p className="note">Achète d’autres bâtiments pour débloquer des améliorations.</p>
  return (
    <ul className="coop-list">
      {list.map((u) => (
        <li key={u.id} className="coop-row">
          <span className="coop-row__icon" aria-hidden="true">{u.building ? BUILDINGS.find((b) => b.id === u.building).icon : '👆'}</span>
          <div className="coop-row__body">
            <b>{u.label}</b>
            <small>{u.detail}</small>
          </div>
          <Buy cost={u.cost} have={coop.eggs} onClick={() => buy(u.id)} label={`Acheter ${u.label}`} />
        </li>
      ))}
    </ul>
  )
}

function Hens({ coop }) {
  const s = useCoop(useShallow((st) => ({ hatch: st.hatch, toggle: st.toggleHen })))
  const cost = rules.hatchCost(coop)
  const slots = rules.henSlots(coop)
  return (
    <>
      <section className="card coop-incubator">
        <div>
          <b>Couveuse</b>
          <small className="muted">
            Fais éclore un œuf : une poule au hasard ({HEN_RARITIES.map((r) => `${r.label.toLowerCase()} ${Math.round(r.chance * 100)} %`).join(', ')}).
            Un doublon fait monter sa poule de niveau.
          </small>
        </div>
        <Buy cost={cost} have={coop.eggs} onClick={s.hatch} label="Faire éclore un œuf" />
      </section>
      <p className="note">
        Places au perchoir : {coop.equipped.length}/{slots}. Touche une poule pour l’installer ou la retirer. Les poules
        n’agissent que sur le poulailler.
      </p>
      <ul className="coop-hens">
        {SPECIAL_HENS.map((hen) => {
          const level = coop.hens[hen.id]
          const on = coop.equipped.includes(hen.id)
          const rarity = RARITY.get(hen.rarity)
          return (
            <li key={hen.id}>
              <button
                type="button"
                className={`coop-hencard${on ? ' is-on' : ''}${level ? '' : ' is-locked'}`}
                style={{ '--rarity': rarity.color }}
                disabled={!level || (!on && coop.equipped.length >= slots)}
                onClick={() => s.toggle(hen.id)}
                aria-pressed={on}
              >
                <span className="coop-hencard__icon" aria-hidden="true">{level ? hen.icon : '❔'}</span>
                <b>{level ? hen.label : '???'}</b>
                <small style={{ color: rarity.color }}>{rarity.label}</small>
                {level ? (
                  <>
                    <small>
                      {hen.detail}
                      {level > 1 ? ` · ×${rules.henScale(coop, hen.id)}` : ''}
                    </small>
                    <span className="coop-stars" aria-label={`Niveau ${level}`}>
                      {'★'.repeat(level)}
                      {'☆'.repeat(HEN_MAX_LEVEL - level)}
                    </span>
                  </>
                ) : (
                  <small className="muted">À découvrir</small>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Trophies({ coop }) {
  const got = coop.trophies.length
  return (
    <>
      <p className="note">
        {got}/{TROPHIES.length} trophées · +{Math.round(got * TROPHY_BONUS * 100)} % de production. Ils restent même après un
        déménagement.
      </p>
      <ul className="coop-trophies">
        {TROPHIES.map((t) => {
          const done = coop.trophies.includes(t.id)
          return (
            <li key={t.id} className={done ? 'is-done' : ''} title={`${t.label} : ${t.detail}`}>
              <span aria-hidden="true">{t.icon}</span>
              <b>{t.label}</b>
              <small>{t.detail}</small>
              {!done && <i style={{ '--ratio': rules.trophyProgress(coop, t) }} />}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Market({ coop }) {
  const sell = useCoop((s) => s.sell)
  const now = Date.now()
  const perToken = rules.eggsPerToken(coop)
  const left = rules.marketLeft(coop, now)
  const could = Math.min(left, Math.floor((coop.eggs / perToken) * 100))
  return (
    <section className="card coop-market">
      <h2>Marché aux œufs</h2>
      <p className="muted">
        Échange tes œufs contre des jetons pour la route. Le prix suit ta production, et le marché n’achète que{' '}
        {tokens(MARKET_DAILY_CAP)} jetons par jour.
      </p>
      <dl>
        <div>
          <dt>1 jeton</dt>
          <dd>🥚 {eggs(perToken)}</dd>
        </div>
        <div>
          <dt>Reste aujourd’hui</dt>
          <dd>{tokens(left)} jetons</dd>
        </div>
      </dl>
      <button type="button" className="coop-sell" disabled={could <= 0} onClick={sell}>
        {left <= 0 ? 'Revenez demain' : could > 0 ? `Vendre pour ${tokens(could)} jetons` : 'Pas assez d’œufs'}
      </button>
    </section>
  )
}

function Skins({ coop }) {
  const s = useCoop(useShallow((st) => ({ buy: st.buySkin, wear: st.wearSkin })))
  const group = (kind, title) => (
    <>
      <h2 className="section-title">{title}</h2>
      <ul className="coop-list">
        {COOP_SKINS.filter((skin) => skin.kind === kind).map((skin) => {
          const has = coop.skins.includes(skin.id)
          const worn = coop.skin[kind] === skin.id
          return (
            <li key={skin.id} className="coop-row">
              <span className={`coop-row__icon coop-swatch coop-decor--${skin.id}`} aria-hidden="true">
                {skin.accessory ?? (kind === 'hen' ? '🐔' : '')}
              </span>
              <div className="coop-row__body">
                <b>{skin.label}</b>
                <small className="muted">{worn ? 'Porté' : has ? 'À toi' : 'À acheter'}</small>
              </div>
              {has ? (
                <button type="button" className="coop-buy" disabled={worn} onClick={() => s.wear(skin.id)}>
                  {worn ? 'Porté' : 'Porter'}
                </button>
              ) : (
                <Buy cost={skin.cost} have={coop.eggs} onClick={() => s.buy(skin.id)} label={`Acheter ${skin.label}`} />
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
  return (
    <>
      <p className="note">La grande poule porte aussi la tenue de la Boutique.</p>
      {group('hen', 'Poule')}
      {group('decor', 'Décor')}
    </>
  )
}

function Prestige({ coop }) {
  const s = useCoop(useShallow((st) => ({ move: st.moveHouse, buy: st.buyPerk })))
  const [confirm, setConfirm] = useState(false)
  const gain = rules.featherGain(coop)
  const free = rules.freeFeathers(coop)
  return (
    <>
      <section className="card coop-prestige">
        <h2>🚚 Déménager</h2>
        <p className="muted">
          Repars de zéro dans un poulailler neuf : œufs, bâtiments et améliorations s’en vont ; poules, looks et trophées
          restent. Tu gagnes des plumes d’or : chacune donne +{Math.round(FEATHER_BONUS * 100)} % de production pour
          toujours.
        </p>
        <dl>
          <div>
            <dt>Plumes d’or</dt>
            <dd>🪶 {coop.feathers} (+{Math.round(coop.feathers * FEATHER_BONUS * 100)} %)</dd>
          </div>
          <div>
            <dt>Prochaine plume</dt>
            <dd>à {eggs(rules.nextFeatherAt(coop))} œufs pondus en tout</dd>
          </div>
        </dl>
        <button type="button" className="coop-sell" disabled={gain < 1} onClick={() => setConfirm(true)}>
          {gain < 1 ? 'Pas encore de plume à gagner' : `Déménager (+${gain} plume${gain > 1 ? 's' : ''})`}
        </button>
      </section>
      <h2 className="section-title">Atouts · {free} plume{free > 1 ? 's' : ''} à dépenser</h2>
      <p className="note">Dépenser une plume garde son bonus de production.</p>
      <ul className="coop-list">
        {PERKS.map((perk) => {
          const has = coop.perks.includes(perk.id)
          return (
            <li key={perk.id} className="coop-row">
              <span className="coop-row__icon" aria-hidden="true">{perk.icon}</span>
              <div className="coop-row__body">
                <b>{perk.label}</b>
                <small>{perk.detail}</small>
              </div>
              <button type="button" className="coop-buy" disabled={has || free < perk.cost} onClick={() => s.buy(perk.id)}>
                {has ? 'Acquis' : `🪶 ${perk.cost}`}
              </button>
            </li>
          )
        })}
      </ul>
      {confirm && (
        <Dialog
          title="Déménager ?"
          onClose={() => setConfirm(false)}
          actions={
            <>
              <button type="button" className="link-button" onClick={() => setConfirm(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="big big--buy"
                onClick={() => {
                  setConfirm(false)
                  s.move()
                }}
              >
                Déménager
              </button>
            </>
          }
        >
          <p>
            Tu perds {eggs(coop.eggs)} œufs et tous tes bâtiments, et tu gagnes {gain} plume{gain > 1 ? 's' : ''} d’or.
          </p>
        </Dialog>
      )}
    </>
  )
}

/** What the coop laid while the game was closed. */
function Away() {
  const { away, dismiss } = useCoop(useShallow((s) => ({ away: s.away, dismiss: s.dismissAway })))
  if (!away || away.eggs < 1) return null
  return (
    <Dialog
      title="Pendant ton absence…"
      onClose={dismiss}
      actions={
        <button type="button" className="big big--buy" onClick={dismiss}>
          Super !
        </button>
      }
    >
      <p>
        En {duration(away.seconds)}, tes poules ont pondu <b>{eggs(away.eggs)} œufs</b>.
      </p>
    </Dialog>
  )
}
