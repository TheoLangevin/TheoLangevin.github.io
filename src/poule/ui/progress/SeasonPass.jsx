import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { PASS_REWARDS, PASS_TIERS } from '../../config/pass.js'
import { CURRENT_SEASON } from '../../config/seasons.js'
import { upgradeById } from '../../config/upgrades.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { count, tokens } from '../format.js'
import { CoinIcon } from '../icons.jsx'
import './progress.css'

/** The season pass: tier reached, progress, rewards to collect (config/pass.js). */
export default function SeasonPass() {
  const [open, setOpen] = useState(false)
  const s = usePoule(useShallow((state) => ({ pass: state.pass, claim: state.claimPass })))
  if (!s.pass) return null
  const { tier, ratio, toNext, ready, claimed } = s.pass
  const next = PASS_REWARDS[tier] ?? null
  return (
    <section className="pass card">
      <div className="pass__head">
        <div>
          <small className="muted">{CURRENT_SEASON.label}</small>
          <h2>Pass de saison</h2>
        </div>
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          Voir les paliers
        </button>
      </div>
      <div className="pass__row">
        <span className="pass__tier" aria-label={`Palier ${tier} sur ${PASS_TIERS}`}>
          {tier}
        </span>
        <div className="pass__progress">
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
            <span style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
          <small className="muted">
            {next
              ? `${count(toNext)} XP pour le palier ${next.tier} : ${next.item ? upgradeById(next.item).label : `${tokens(next.tokens)} jetons`}`
              : 'Pass terminé, bravo !'}
          </small>
        </div>
      </div>
      {ready.length > 0 && (
        <button type="button" className="big big--buy" onClick={s.claim}>
          Récupérer {ready.length} palier{ready.length > 1 ? 's' : ''}
          <small>
            +{tokens(ready.reduce((sum, reward) => sum + reward.tokens, 0))} jetons
            {ready.some((reward) => reward.item) ? ' + objet exclusif' : ''}
          </small>
        </button>
      )}
      {open && (
        <Dialog title="Pass de saison" onClose={() => setOpen(false)}>
          <p>Gagnez de l’XP en jouant pour monter les {PASS_TIERS} paliers. Tout le monde a le pass, rien à acheter.</p>
          <ul className="pass__list">
            {PASS_REWARDS.map((reward) => (
              <li
                key={reward.tier}
                className={claimed.includes(reward.tier) ? 'done' : reward.tier <= tier ? 'ready' : ''}
              >
                <b>{reward.tier}</b>
                <span>
                  <CoinIcon size={12} /> {tokens(reward.tokens)}
                  {reward.item && <em> · {upgradeById(reward.item).label}</em>}
                </span>
                <small>{claimed.includes(reward.tier) ? '✓' : reward.tier <= tier ? 'À récupérer' : `${count(reward.xp)} XP`}</small>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </section>
  )
}
