import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  BUILDINGS,
  BUILDING_TIERS,
  COOP_SKINS,
  HEN_MAX_LEVEL,
  HEN_RARITIES,
  MILESTONES,
  PERKS,
  SPECIAL_HENS,
  TROPHIES,
  TROPHY_BONUS,
  FEATHER_BONUS,
  CALENDAR,
  MARKET_DAILY_CAP,
  SETTLE_SHARE,
  UNLOCKS,
} from '../../config/coop.js'
import * as rules from '../../domain/coop.js'
import { useAccount } from '../../state/useAccount.js'
import { useCoop } from '../../state/useCoop.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { tokens } from '../format.js'
import { duration, eggs } from '../coop/format.js'
import Mannequin from '../road/Mannequin.jsx'
import CoopYard, { CoopEstate } from '../coop/CoopYard.jsx'
import { PortalOverlay, WorldBar, WorldView } from '../coop/Worlds.jsx'
import TapState from '../coop/TapState.jsx'
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

  const now = Date.now()
  const claimable =
    Boolean(rules.calendarToday(coop, now)) ||
    (coop.orders?.list ?? []).some((order, i) => !coop.orders.claimed.includes(i) && rules.orderProgress(coop, order).done >= order.goal)
  const tabs = [
    { id: 'build', label: 'Bâtiments' },
    ...(rules.unlocked(coop, 'upgrades') ? [{ id: 'goals', label: claimable ? 'Objectifs •' : 'Objectifs' }] : []),
    ...PARTS.filter((p) => p.tab && rules.unlocked(coop, p.id)).map((p) => ({ id: p.id, label: p.tab })),
  ]
  const next = PARTS.find((p) => !rules.unlocked(coop, p.id))

  if (coop.world !== 'farm') {
    return (
      <main className="screen screen--coop">
        <WorldBar coop={coop} />
        <WorldView coop={coop} />
        <PortalOverlay />
        <Away />
      </main>
    )
  }

  return (
    <main className="screen screen--coop">
      <WorldBar coop={coop} />
      <Stage coop={coop} />
      {Object.keys(coop.buildings).length > 0 && <CoopEstate coop={coop} />}
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
      {tab === 'goals' && <Goals coop={coop} />}
      {tab === 'upgrades' && <Upgrades coop={coop} />}
      {tab === 'hens' && <Hens coop={coop} />}
      {tab === 'trophies' && <Trophies coop={coop} />}
      {tab === 'market' && <Market coop={coop} />}
      {tab === 'skins' && <Skins coop={coop} />}
      {tab === 'prestige' && <Prestige coop={coop} />}
      <PortalOverlay />
      <Away />
    </main>
  )
}

/** The counter, the big hen and the golden egg. */
function Stage({ coop }) {
  const tap = useCoop((s) => s.tap)
  const golden = useCoop((s) => s.golden)
  const catchGolden = useCoop((s) => s.catchGolden)
  const tapShare = useCoop((s) => s.tapShare)
  const equipped = usePoule((s) => s.equipped)
  const [floaters, setFloaters] = useState([])
  const [squash, setSquash] = useState(0)
  const stage = useRef(null)
  const now = Date.now()
  const frenzy = now < coop.frenzyUntil
  const skin = COOP_SKINS.find((s) => s.id === coop.skin.hen)
  const pps = rules.production(coop) * rules.eventMultiplier(coop, now)
  const event = rules.activeEvent(now)

  const onTap = (event) => {
    event.preventDefault()
    // Taps made by a script (dispatched events) do not count.
    if (!event.isTrusted) return
    const { laid, lucky } = tap(1)
    const box = stage.current.getBoundingClientRect()
    const id = Math.random()
    setFloaters((list) => [...list.slice(-12), { id, x: event.clientX - box.left, y: event.clientY - box.top, laid, lucky }])
    setTimeout(() => setFloaters((list) => list.filter((f) => f.id !== id)), 900)
    setSquash((n) => n + 1)
  }

  return (
    <section ref={stage} className={`coop-stage coop-decor--${coop.skin.decor}${frenzy ? ' is-frenzy' : ''}`}>
      <CoopYard coop={coop} />
      {event && <div className="coop-snow" aria-hidden="true" />}
      <div className="coop-count">
        <b>{eggs(coop.eggs)}</b> œufs
        <small>{pps > 0 ? `${eggs(pps)} par seconde` : 'Touche la poule pour pondre !'}</small>
        {event && <span className="coop-event">🎄 {event.label}</span>}
        <TapState share={tapShare} />
        {rules.settling(coop) < 1 && (
          <span className="coop-settle">🚚 Les poules s’installent : {Math.floor(rules.settling(coop) * 100)} %</span>
        )}
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
      {floaters.filter((f) => f.laid > 0).map((f) => (
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

function Buy({ cost, have, onClick, label, qty = 1 }) {
  return (
    <button type="button" className="coop-buy" disabled={have < cost} onClick={onClick} aria-label={label}>
      {qty > 1 && <small>×{qty}</small>}🥚 {eggs(cost)}
    </button>
  )
}

const MODES = [1, 10, 100, 'max']

function Buildings({ coop }) {
  const { buy, mode, setMode } = useCoop(useShallow((s) => ({ buy: s.buyBuilding, mode: s.buyMode, setMode: s.setBuyMode })))
  const { shown, next } = rules.visibleBuildings(coop)
  const total = rules.production(coop) || 1
  return (
    <>
    {coop.bought >= 10 && (
      <div className="segmented coop-modes" role="group" aria-label="Quantité à acheter">
        {MODES.map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m === 'max' ? 'Max' : `×${m}`}
          </button>
        ))}
      </div>
    )}
    <ul className="coop-list">
      {shown.map((b) => {
        const n = rules.owned(coop, b.id)
        const qty = mode === 'max' ? Math.max(1, rules.affordable(coop, b.id)) : mode
        const cost = rules.buildingCostN(b.id, n, qty)
        const pps = rules.buildingPps(coop, b.id) * rules.globalMultiplier(coop)
        const milestone = MILESTONES.find((m) => n < m)
        return (
          <li key={b.id} className="coop-row">
            <span className="coop-row__icon" aria-hidden="true">{b.icon}</span>
            <div className="coop-row__body">
              <b>
                {b.label} <small className="muted">×{n}</small>
                {n > 0 && (
                  <small className="coop-tier" style={{ '--tier': BUILDING_TIERS[rules.buildingLevel(n) - 1].color }}>
                    niv. {rules.buildingLevel(n)} · {BUILDING_TIERS[rules.buildingLevel(n) - 1].label}
                  </small>
                )}
              </b>
              <small>
                {n ? `${eggs(pps)}/s · ${pps / total < 0.01 ? '< 1' : Math.round((pps / total) * 100)} % du total` : `+${eggs(b.pps * rules.globalMultiplier(coop))} œufs/s chacun`}
              </small>
              {n > 0 && milestone && (
                <small className="muted">
                  Niveau {rules.buildingLevel(n) + 1} à {milestone} : production doublée ({n}/{milestone})
                </small>
              )}
            </div>
            <Buy cost={cost} have={coop.eggs} onClick={() => buy(b.id)} label={`Acheter ${qty} ${b.label}`} qty={qty} />
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
    </>
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
        {coop.tickets > 0 ? (
          <button type="button" className="coop-buy" onClick={s.hatch}>
            🎟️ Gratuit <small>({coop.tickets})</small>
          </button>
        ) : (
          <Buy cost={cost} have={coop.eggs} onClick={s.hatch} label="Faire éclore un œuf" />
        )}
      </section>
      <section className="card coop-collections">
        <b>Collections</b>
        <small className="muted">Toutes les poules d’une rareté : un bonus de production pour toujours.</small>
        <ul>
          {rules.collections(coop).map((c) => (
            <li key={c.id} className={c.done ? 'is-done' : ''} style={{ '--rarity': c.color }}>
              <span>{c.label}</span>
              <span>
                {c.got}/{c.total}
              </span>
              <b>+{Math.round(c.bonus * 100)} %</b>
            </li>
          ))}
        </ul>
      </section>
      {rules.settling(coop) < 1 && (
        <p className="note">
          🚚 Après le déménagement, tes poules s’installent : leurs bonus (et ceux des collections) sont à{' '}
          {Math.floor(rules.settling(coop) * 100)} %. Ils reviennent en entier quand le nouveau poulailler aura pondu{' '}
          {eggs(coop.lastRun * SETTLE_SHARE)} œufs.
        </p>
      )}
      <p className="note">
        Places au perchoir : {coop.equipped.length}/{slots}. Touche une poule pour l’installer ou la retirer. Les poules
        n’agissent que sur le poulailler.
      </p>
      <ul className="coop-hens">
        {SPECIAL_HENS.filter((hen) => !hen.event || coop.hens[hen.id] || rules.activeEvent(Date.now())?.hen === hen.id).map((hen) => {
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
                <small style={{ color: rarity.color }}>{hen.event ? 'Événement' : rarity.label}</small>
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
  const stats = [
    ['Œufs pondus en tout', eggs(coop.lifetime)],
    ['Depuis le dernier déménagement', eggs(coop.total)],
    ['Cette semaine', eggs(rules.weekEggs(coop))],
    ['Record de production', `${eggs(coop.bestPps)}/s`],
    ['Temps de jeu', duration(coop.played)],
    ['Touchers', eggs(coop.taps)],
    ['Bâtiments achetés', eggs(coop.bought)],
    ['Œufs éclos', eggs(coop.hatched)],
    ['Œufs dorés attrapés', eggs(coop.golden)],
    ['Déménagements', eggs(coop.moves)],
  ]
  return (
    <>
      <section className="card coop-prestige">
        <h2>Statistiques</h2>
        <dl>
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
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
        {COOP_SKINS.filter(
          (skin) => skin.kind === kind && (!skin.event || coop.skins.includes(skin.id) || rules.activeEvent(Date.now())?.id === skin.event),
        ).map((skin) => {
          const has = coop.skins.includes(skin.id)
          const worn = coop.skin[kind] === skin.id
          return (
            <li key={skin.id} className="coop-row">
              <span className={`coop-row__icon coop-swatch coop-decor--${skin.id}`} aria-hidden="true">
                {skin.accessory ?? (kind === 'hen' ? '🐔' : '')}
              </span>
              <div className="coop-row__body">
                <b>{skin.label}</b>
                <small className="muted">
                  {worn ? 'Porté' : has ? 'À toi' : skin.event ? 'Événement : seulement pendant les fêtes' : 'À acheter'}
                </small>
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
            Tes poules spéciales devront s’installer : leurs bonus repartent de 0 et reviennent quand le nouveau
            poulailler aura pondu {eggs(coop.total * SETTLE_SHARE)} œufs.
          </p>
        </Dialog>
      )}
    </>
  )
}

/** Daily calendar, the farmer's orders and the family goal. */
function Goals({ coop }) {
  const s = useCoop(useShallow((st) => ({ cal: st.claimCalendar, order: st.claimOrder, family: st.claimFamily })))
  const now = Date.now()
  const today = rules.calendarToday(coop, now)
  const streak = today ? today.streak - 1 : coop.calendar.streak
  const current = today ? today.day : ((coop.calendar.streak - 1) % CALENDAR.length) + 1
  return (
    <>
      <section className="card coop-goal">
        <h2>📅 Calendrier de la ferme</h2>
        <p className="muted">Reviens chaque jour : la récompense grandit jusqu’au 7ᵉ jour. Un jour manqué, et ça repart à 1.</p>
        <ol className="coop-calendar">
          {CALENDAR.map((step) => (
            <li
              key={step.day}
              className={step.day < current || (!today && step.day === current) ? 'is-done' : step.day === current && today ? 'is-today' : ''}
            >
              <b>J{step.day}</b>
              <span>{step.tickets ? `🎟️×${step.tickets}` : '🥚'}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="coop-sell" disabled={!today} onClick={s.cal}>
          {today ? `Récupérer le jour ${today.day}` : `Déjà récupéré · série de ${streak} jour${streak > 1 ? 's' : ''}`}
        </button>
      </section>

      <section className="card coop-goal">
        <h2>📦 Commandes du fermier</h2>
        <p className="muted">
          Trois commandes par jour. Chacune rapporte {eggs(rules.orderReward(coop))} œufs ; les trois ensemble, un ticket de
          couveuse{rules.activeEvent(now) ? ' et une Poule des Neiges' : ''}.
        </p>
        <ul className="coop-list">
          {(coop.orders?.list ?? []).map((order, index) => {
            const p = rules.orderProgress(coop, order)
            const claimed = coop.orders.claimed.includes(index)
            return (
              <li key={index} className="coop-row">
                <div className="coop-row__body">
                  <b>{p.label.replace(String(order.goal), eggs(order.goal))}</b>
                  <i className="coop-progress" style={{ '--ratio': p.done / p.goal }} />
                  <small className="muted">
                    {eggs(p.done)} / {eggs(p.goal)}
                  </small>
                </div>
                <button type="button" className="coop-buy" disabled={claimed || p.done < p.goal} onClick={() => s.order(index)}>
                  {claimed ? 'Livrée' : 'Livrer'}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <Family coop={coop} claim={s.family} />
    </>
  )
}

function Family({ coop, claim }) {
  const { signedIn, mine, loadTeams } = useAccount(
    useShallow((st) => ({ signedIn: st.status === 'signedIn' && Boolean(st.pseudo), mine: st.teams?.mine ?? null, loadTeams: st.loadTeams })),
  )
  useEffect(() => {
    if (signedIn) loadTeams()
  }, [signedIn, loadTeams])
  const total = mine?.coopWeek ?? 0
  return (
    <section className="card coop-goal">
      <h2>👨‍👩‍👧 Objectif de famille</h2>
      {!mine ? (
        <p className="muted">
          Rejoins une famille poule (Classement → Familles poule) : chaque semaine, vos œufs s’additionnent et chaque palier
          donne des tickets de couveuse à tous.
        </p>
      ) : (
        <>
          <p className="muted">
            {mine.name} · {eggs(total)} œufs pondus ensemble cette semaine (mis à jour à chaque synchronisation).
          </p>
          <ul className="coop-list">
            {rules.familySteps(coop, total).map((step) => (
              <li key={step.index} className="coop-row">
                <div className="coop-row__body">
                  <b>
                    {step.label} · {eggs(step.eggs)} œufs
                  </b>
                  <i className="coop-progress" style={{ '--ratio': Math.min(1, total / step.eggs) }} />
                </div>
                <button
                  type="button"
                  className="coop-buy"
                  disabled={!step.reached || step.claimed || rules.weekEggs(coop) <= 0}
                  onClick={() => claim(step.index, total)}
                >
                  {step.claimed ? 'Reçu' : `🎟️×${step.tickets}`}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
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
