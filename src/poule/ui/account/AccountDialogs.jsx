import { useShallow } from 'zustand/react/shallow'
import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import { count, multiplierLabel, tokens } from '../format.js'
import Avatar from './Avatar.jsx'
import Dialog from './Dialog.jsx'
import PseudoForm from './PseudoForm.jsx'
import { syncLabel } from './syncLabel.js'
import './account.css'

function ProfileDialog({ onClose }) {
  const { user, pseudo, sync, syncNow, signOut, leaveLeaderboard } = useAccount(
    useShallow((state) => ({
      user: state.user,
      pseudo: state.pseudo,
      sync: state.sync,
      syncNow: state.syncNow,
      signOut: state.signOut,
      leaveLeaderboard: state.leaveLeaderboard,
    })),
  )
  const { stats, progression, balance } = usePoule(
    useShallow((state) => ({ stats: state.stats, progression: state.progression, balance: state.balanceCents })),
  )

  const figures = [
    ['Niveau', progression ? count(progression.level) : '—'],
    ['Solde', `${tokens(balance)} jetons`],
    ['Plumes', progression ? count(progression.feathers) : '—'],
    ['Parties', stats ? count(stats.played) : '—'],
    ['Succès', progression ? count(progression.achievements.length) : '—'],
    ['Meilleur', stats?.bestMultiplier ? multiplierLabel(stats.bestMultiplier) : '—'],
  ]

  return (
    <Dialog title="Mon compte" onClose={onClose}>
      <div className="profile__who">
        <Avatar user={user} size={56} />
        <div>
          <b>{user.name}</b>
          {user.email && <small>{user.email}</small>}
        </div>
      </div>

      <dl className="profile__figures">
        {figures.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <PseudoForm
        key={pseudo ?? ''}
        initial={pseudo ?? ''}
        submitLabel={pseudo ? 'Changer' : 'Rejoindre le classement'}
      />
      {pseudo && (
        <button type="button" className="link-button" onClick={leaveLeaderboard}>
          Ne plus apparaître dans le classement
        </button>
      )}

      <div className={`profile__sync profile__sync--${sync.state}`}>
        <span>{syncLabel(sync)}</span>
        <button type="button" onClick={syncNow} disabled={sync.state === 'syncing'}>
          Synchroniser
        </button>
      </div>
      <p className="box__note">
        Votre progression est enregistrée sur cet appareil et dans votre compte : connectez-vous ailleurs pour la
        retrouver.
      </p>

      <button type="button" className="profile__signout" onClick={signOut}>
        Se déconnecter
      </button>
    </Dialog>
  )
}

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

/** Whichever account dialog is open. */
export default function AccountDialogs() {
  const dialog = useAccount((state) => state.dialog)
  const user = useAccount((state) => state.user)
  const close = useAccount((state) => state.closeDialog)
  if (!dialog || !user) return null
  if (dialog === 'conflict') return <ConflictDialog />
  if (dialog === 'pseudo') return <PseudoDialog onClose={close} />
  return <ProfileDialog onClose={close} />
}
