import { useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { BUILDING_TIERS, MILESTONES } from '../../config/coop.js'
import { FACTORY_BOOST, WORLDS, worldById } from '../../config/worlds.js'
import { buildingLevel } from '../../domain/coop.js'
import * as rules from '../../domain/worlds.js'
import { useCoop } from '../../state/useCoop.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import Mannequin from '../road/Mannequin.jsx'
import TapState from './TapState.jsx'
import { eggs } from './format.js'
import './worlds.css'

/** The worlds' bar: the farm, the worlds opened, the next portal. Shows once the first portal comes in sight. */
export function WorldBar({ coop }) {
  const select = useCoop((s) => s.selectWorld)
  const [portal, setPortal] = useState(null)
  const next = rules.nextWorld(coop)
  const opened = WORLDS.filter((w) => rules.isOpen(coop, w.id))
  if (!opened.length && coop.lifetime < WORLDS[0].portal / 20) return null
  return (
    <>
      <nav className="worldbar" aria-label="Mondes">
        <button type="button" aria-pressed={coop.world === 'farm'} onClick={() => select('farm')}>
          <span aria-hidden="true">🐔</span> La Ferme
        </button>
        {opened.map((w) => (
          <button key={w.id} type="button" className={`worldbar--${w.id}`} aria-pressed={coop.world === w.id} onClick={() => select(w.id)}>
            <span aria-hidden="true">{w.icon}</span> {w.label.replace(/^(L’|Le |La )/, '')}
          </button>
        ))}
        {next && (
          <button type="button" className="worldbar__portal" onClick={() => setPortal(next.id)}>
            <span aria-hidden="true">🌀</span> {next.icon} ?
            <i style={{ '--ratio': Math.min(1, coop.eggs / next.portal) }} />
          </button>
        )}
      </nav>
      {portal && <PortalDialog coop={coop} id={portal} onClose={() => setPortal(null)} />}
    </>
  )
}

function PortalDialog({ coop, id, onClose }) {
  const open = useCoop((s) => s.openPortal)
  const world = worldById(id)
  const enough = coop.eggs >= world.portal
  return (
    <Dialog
      title="Un portail s’ouvre…"
      onClose={onClose}
      actions={
        <button
          type="button"
          className="big big--buy"
          disabled={!enough}
          onClick={() => {
            onClose()
            open(id)
          }}
        >
          {enough ? `Ouvrir pour 🥚 ${eggs(world.portal)}` : `Il faut 🥚 ${eggs(world.portal)}`}
        </button>
      }
    >
      <div className={`portal-card worldstage--${id}`}>
        <span className="portal-card__icon" aria-hidden="true">
          {world.icon}
        </span>
        <b>{world.label}</b>
        <small>{world.blurb}</small>
      </div>
      <ul className="portal-facts">
        <li>
          Monnaie : {world.currency.icon} {world.currency.label}
        </li>
        <li>{world.buildings.length} bâtiments, dont une usine qui booste tout le monde</li>
        <li>Ce que le monde produit booste les œufs de la ferme, pour toujours</li>
        <li>Les mondes restent après un déménagement</li>
      </ul>
      {!enough && <i className="coop-progress" style={{ '--ratio': Math.min(1, coop.eggs / world.portal) }} />}
    </Dialog>
  )
}

/** A world: its stage (own sky, own currency, the hen dressed for it) and its buildings. */
export function WorldView({ coop }) {
  const world = worldById(coop.world)
  const w = coop.worlds[world.id]
  const s = useCoop(useShallow((st) => ({ tap: st.tap, buy: st.buyWorldBuilding, mode: st.buyMode, setMode: st.setBuyMode })))
  const equipped = usePoule((st) => st.equipped)
  const tapShare = useCoop((st) => st.tapShare)
  const [floaters, setFloaters] = useState([])
  const [squash, setSquash] = useState(0)
  const stage = useRef(null)
  const pps = rules.worldPps(coop, world.id)
  const { shown, next } = rules.visibleWorldBuildings(coop, world.id)
  const cur = world.currency

  const onTap = (event) => {
    event.preventDefault()
    // Taps made by a script (dispatched events) do not count.
    if (!event.isTrusted) return
    const { laid } = s.tap(1)
    const box = stage.current.getBoundingClientRect()
    const id = Math.random()
    setFloaters((list) => [...list.slice(-12), { id, x: event.clientX - box.left, y: event.clientY - box.top, laid }])
    setTimeout(() => setFloaters((list) => list.filter((f) => f.id !== id)), 900)
    setSquash((n) => n + 1)
  }

  return (
    <>
      <section ref={stage} className={`coop-stage worldstage worldstage--${world.id}`}>
        <div className="worldstage__fx" aria-hidden="true" />
        <div className="coop-count">
          <b>
            {cur.icon} {eggs(w.amount)}
          </b>
          {cur.label}
          <small>{pps > 0 ? `${eggs(pps)} par seconde` : 'Touche la poule pour commencer'}</small>
          <TapState share={tapShare} />
          <span className="worldstage__bonus">🐔 Ferme +{Math.round(rules.worldFarmBonus(coop, world.id) * 100)} %</span>
        </div>
        <div className="worldstage__props" aria-hidden="true">
          {world.buildings
            .filter((b) => rules.worldOwned(coop, world.id, b.id) > 0)
            .map((b, i) => {
              const n = rules.worldOwned(coop, world.id, b.id)
              const level = buildingLevel(n)
              return (
                <span
                  key={b.id}
                  className={`worldprop worldprop--${i} coop-spot--lv${level}`}
                  style={{ '--tier': BUILDING_TIERS[level - 1].color, '--size': `${22 + level * 5}px` }}
                >
                  <span key={n} className="coop-spot__icons">
                    {b.icon}
                  </span>
                  <i className="coop-spot__base" />
                </span>
              )
            })}
        </div>
        <button type="button" className="coop-hen" key={squash % 2} onPointerDown={onTap} aria-label={`Récolter des ${cur.label}`}>
          <Mannequin equipped={equipped ?? {}} size="large" />
          <span className="coop-hen__accessory" aria-hidden="true">
            {world.hat}
          </span>
        </button>
        {floaters.filter((f) => f.laid > 0).map((f) => (
          <span key={f.id} className="coop-float" style={{ left: f.x, top: f.y }} aria-hidden="true">
            +{eggs(f.laid)} {cur.icon}
          </span>
        ))}
      </section>

      <div className="segmented coop-modes" role="group" aria-label="Quantité à acheter">
        {[1, 10, 100, 'max'].map((m) => (
          <button key={m} type="button" aria-pressed={s.mode === m} onClick={() => s.setMode(m)}>
            {m === 'max' ? 'Max' : `×${m}`}
          </button>
        ))}
      </div>

      <ul className="coop-list">
        {shown.map((b) => {
          const n = rules.worldOwned(coop, world.id, b.id)
          let qty = s.mode
          if (s.mode === 'max') {
            qty = 0
            while (qty < 10000 && rules.worldCost(world, b, n, qty + 1) <= w.amount) qty++
            qty = Math.max(1, qty)
          }
          const cost = rules.worldCost(world, b, n, qty)
          const out = rules.worldBuildingPps(coop, world.id, b)
          const milestone = MILESTONES.find((m) => n < m)
          return (
            <li key={b.id} className={`coop-row${b.factory ? ' is-factory' : ''}`}>
              <span className="coop-row__icon" aria-hidden="true">
                {b.icon}
              </span>
              <div className="coop-row__body">
                <b>
                  {b.label} <small className="muted">×{n}</small>
                </b>
                <small>
                  {b.factory
                    ? `Usine : +${Math.round(FACTORY_BOOST * 100)} % de production du monde chacune (${Math.round(rules.factoryBoost(coop, world.id) * 100)} % en tout)`
                    : n
                      ? `${eggs(out)} ${cur.icon}/s`
                      : `+${eggs(b.pps)} ${cur.icon}/s chacun`}
                </small>
                {n > 0 && milestone && !b.factory && (
                  <small className="muted">
                    Niveau {buildingLevel(n) + 1} à {milestone} ({n}/{milestone})
                  </small>
                )}
              </div>
              <button type="button" className="coop-buy" disabled={w.amount < cost} onClick={() => s.buy(b.id)}>
                {qty > 1 && <small>×{qty}</small>}
                {cur.icon} {eggs(cost)}
              </button>
            </li>
          )
        })}
        {next && (
          <li className="coop-row is-mystery">
            <span className="coop-row__icon" aria-hidden="true">
              ❔
            </span>
            <div className="coop-row__body">
              <b>???</b>
              <small className="muted">
                Se révèle à {cur.icon} {eggs(next.cost / 2)} récoltés
              </small>
            </div>
          </li>
        )}
      </ul>
    </>
  )
}

/** The portal opening: a full-screen swirl, then the new world. */
export function PortalOverlay() {
  const fx = useCoop((s) => s.portalFx)
  if (!fx) return null
  const world = worldById(fx.id)
  return (
    <div className={`portal-fx worldstage--${world.id}`} key={fx.at} aria-live="polite">
      <div className="portal-fx__swirl" aria-hidden="true" />
      <div className="portal-fx__text">
        <span aria-hidden="true">{world.icon}</span>
        <small>Nouveau monde</small>
        <b>{world.label}</b>
      </div>
    </div>
  )
}
