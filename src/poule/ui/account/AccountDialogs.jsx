import { useShallow } from 'zustand/react/shallow'
import { RANK_REWARDS } from '../../config/seasons.js'
import { upgradeById } from '../../config/upgrades.js'
import { useAccount } from '../../state/useAccount.js'
import { divisionById, divisionFor } from '../../domain/leagues.js'
import { count, multiplierLabel, tokens } from '../format.js'
import { CoinIcon, GiftIcon } from '../icons.jsx'
import LeagueBadge from '../league/LeagueBadge.jsx'
import Dialog from './Dialog.jsx'
import PseudoForm from './PseudoForm.jsx'
import './account.css'

function SaveCard({ title, save, action, onChoose }) {
  return (
    <div className="conflict__card">
      <h3>{title}</h3>
      <dl>
        <div>
          <dt>Niveau</dt>
          <dd>{count(save.level)}</dd>
        </div>
        <div>
          <dt>Solde</dt>
          <dd>{tokens(save.balanceCents)}</dd>
        </div>
        <div>
          <dt>Parties</dt>
          <dd>{count(save.played)}</dd>
        </div>
        <div>
          <dt>Améliorations</dt>
          <dd>{count(save.upgrades)}</dd>
        </div>
      </dl>
      <button type="button" onClick={onChoose}>
        {action}
      </button>
    </div>
  )
}

function ConflictDialog() {
  const { conflict, resolve } = useAccount(
    useShallow((state) => ({ conflict: state.conflict, resolve: state.resolveConflict })),
  )
  if (!conflict) return null
  return (
    <Dialog title="Quelle progression garder ?" locked wide>
      <p>
        Cet appareil et votre compte ont chacun une progression différente. Choisissez celle à garder : l’autre sera
        remplacée.
      </p>
      <div className="conflict">
        <SaveCard
          title="Cet appareil"
          save={conflict.device}
          action="Garder cet appareil"
          onChoose={() => resolve('device')}
        />
        <SaveCard
          title="Mon compte"
          save={conflict.account}
          action="Garder le compte"
          onChoose={() => resolve('account')}
        />
      </div>
    </Dialog>
  )
}

function PseudoDialog({ onClose }) {
  return (
    <Dialog title="Choisissez votre pseudo" onClose={onClose}>
      <p>Il apparaîtra dans le classement, à la place de votre nom Google.</p>
      <PseudoForm submitLabel="Valider" onDone={onClose} />
      <button type="button" className="link-button" onClick={onClose}>
        Plus tard
      </button>
    </Dialog>
  )
}

const signed = (value) => (value > 0 ? `+${count(value)}` : value < 0 ? `−${count(-value)}` : '0')

/** Finished weeks (league points, rewards) and yesterday's daily challenge, waiting to be collected. */
function RewardDialog({ onClose }) {
  const { pending, claim } = useAccount(
    useShallow((state) => ({ pending: state.pendingReward, claim: state.claimReward })),
  )
  if (!pending) return null
  const { weeks, league, daily } = pending.preview
  const before = weeks.length ? divisionById(weeks[0].before) : null
  const after = divisionFor(league.lp)
  const promoted = before && after.min > before.min
  const demoted = before && after.min < before.min
  const tokensTotal = weeks.reduce((sum, week) => sum + week.reward.tokens, 0) + (daily?.reward?.tokens ?? 0)
  const items = [...new Set(weeks.flatMap((week) => week.reward.items))]
  const title = weeks.length ? (promoted ? 'Promotion !' : demoted ? 'Relégation' : 'Semaine terminée') : 'Défi d’hier'

  return (
    <Dialog
      title={title}
      onClose={onClose}
      actions={
        <button type="button" className="big big--buy" onClick={claim}>
          {tokensTotal > 0 ? `Récupérer ${tokens(tokensTotal)} jetons` : 'Continuer'}
        </button>
      }
    >
      {weeks.length > 0 && (
        <div className="reward__hero">
          <LeagueBadge division={after} size={72} />
          <p>
            <b>{after.label}</b>
            <br />
            {count(league.lp)} PL ({signed(weeks.reduce((sum, week) => sum + week.delta, 0))})
            {promoted && before ? ` · depuis ${before.label}` : ''}
            {demoted && before ? ` · descendu de ${before.label}` : ''}
          </p>
        </div>
      )}
      {weeks.length > 0 && (
        <ul className="reward__weeks">
          {weeks.map((week) => {
            const tier = RANK_REWARDS.find((entry) => entry.id === week.reward.tier)
            return (
              <li key={week.season}>
                <b>Semaine {week.season.slice(-2)}</b>
                <span>
                  {week.score
                    ? `${count(week.score)} XP${week.rank ? ` · ${week.rank === 1 ? '1er' : `${week.rank}e`} sur ${count(week.total)}` : ''}${tier ? ` · ${tier.label}` : ''}`
                    : 'Pas joué'}
                </span>
                <small>
                  {week.score ? `+${week.perf} score` : ''}
                  {week.bonus ? ` · +${week.bonus} rang` : ''}
                  {week.upkeep ? ` · −${week.upkeep} entretien` : ''}
                  {!week.score ? `${signed(week.delta)} inactivité` : ''}
                </small>
                <b className={week.delta >= 0 ? 'gain--up' : 'gain--down'}>{signed(week.delta)} PL</b>
              </li>
            )
          })}
        </ul>
      )}
      {daily && (
        <p className="reward__daily">
          <b>Défi du {daily.date.slice(8, 10)}/{daily.date.slice(5, 7)}</b> :{' '}
          {daily.best ? `${multiplierLabel(daily.best)}, ${daily.rank === 1 ? '1er' : `${daily.rank}e`} sur ${count(daily.total)}` : 'aucun encaissement'}
          {daily.reward ? ` · ${daily.reward.label}` : ''}
        </p>
      )}
      <ul className="reward__list">
        {tokensTotal > 0 && (
          <li>
            <CoinIcon size={22} /> <b>{tokens(tokensTotal)}</b> jetons
          </li>
        )}
        {items.map((id) => (
          <li key={id}>
            <GiftIcon size={20} /> <b>{upgradeById(id).label}</b> (exclusif)
          </li>
        ))}
        {tokensTotal === 0 && items.length === 0 && <li>Pas de récompense cette fois. Jouez cette semaine pour remonter !</li>}
      </ul>
    </Dialog>
  )
}

/** Whichever account dialog is open. */
export default function AccountDialogs() {
  const dialog = useAccount((state) => state.dialog)
  const user = useAccount((state) => state.user)
  const close = useAccount((state) => state.closeDialog)
  if (!dialog || !user) return null
  if (dialog === 'conflict') return <ConflictDialog />
  if (dialog === 'pseudo') return <PseudoDialog onClose={close} />
  if (dialog === 'reward') return <RewardDialog onClose={close} />
  return null
}
