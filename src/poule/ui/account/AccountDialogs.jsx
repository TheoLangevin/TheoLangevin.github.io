import { useShallow } from 'zustand/react/shallow'
import { LEAGUES, RANK_REWARDS } from '../../config/seasons.js'
import { upgradeById } from '../../config/upgrades.js'
import { useAccount } from '../../state/useAccount.js'
import { count, tokens } from '../format.js'
import { CoinIcon, FeatherIcon, GiftIcon } from '../icons.jsx'
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

/** Last week's reward, waiting to be collected. */
function RewardDialog({ onClose }) {
  const { pending, claim } = useAccount(
    useShallow((state) => ({ pending: state.pendingReward, claim: state.claimReward })),
  )
  if (!pending) return null
  const { reward } = pending
  const league = LEAGUES.find((entry) => entry.id === reward.league)
  const tier = RANK_REWARDS.find((entry) => entry.id === reward.tier)
  return (
    <Dialog title={`Saison ${pending.season.slice(-2)} terminée !`} onClose={onClose}>
      <div className="reward__hero">
        <span className="league" style={{ '--league': league.color, width: 72, height: 72, fontSize: 32 }}>
          {league.label.charAt(0)}
        </span>
        <p>
          <b>
            {pending.rank}
            {pending.rank === 1 ? 're' : 'e'} sur {count(pending.total)}
          </b>
          <br />
          Ligue {league.label} · {count(pending.score)} XP{tier ? ` · ${tier.label}` : ''}
        </p>
      </div>
      <ul className="reward__list">
        <li>
          <CoinIcon size={22} /> <b>{tokens(reward.tokens)}</b> jetons
        </li>
        <li>
          <FeatherIcon size={20} /> <b>{count(reward.feathers)}</b> plumes
        </li>
        {reward.items.map((id) => (
          <li key={id}>
            <GiftIcon size={20} /> <b>{upgradeById(id).label}</b> (exclusif)
          </li>
        ))}
      </ul>
      <button type="button" className="big big--buy" onClick={claim}>
        Récupérer
      </button>
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
