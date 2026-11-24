import { useShallow } from 'zustand/react/shallow'
import { ACHIEVEMENTS } from '../../config/achievements.js'
import { RTP } from '../../config/economy.js'
import { MODES } from '../../config/modes.js'
import { upgradeById } from '../../config/upgrades.js'
import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import Avatar from '../account/Avatar.jsx'
import { syncLabel } from '../account/syncLabel.js'
import { count, multiplierLabel, percent, signedTokens, tokens } from '../format.js'
import { FeatherIcon } from '../icons.jsx'
import './profile.css'

const NONE = []

function Switch({ label, checked, onChange }) {
  return (
    <div className="toggle">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
      />
    </div>
  )
}

function AccountCard() {
  const a = useAccount(
    useShallow((state) => ({
      status: state.status,
      user: state.user,
      pseudo: state.pseudo,
      sync: state.sync,
      signIn: state.signIn,
      signOut: state.signOut,
      syncNow: state.syncNow,
      openDialog: state.openDialog,
      leaveLeaderboard: state.leaveLeaderboard,
    })),
  )
  const title = usePoule((state) => upgradeById(state.progression?.equipped.title)?.label)

  if (a.status === 'disabled' || a.status === 'unavailable' || a.status === 'loading') {
    return (
      <section className="card account-card">
        <p className="muted">
          {a.status === 'loading'
            ? 'Connexion au compte…'
            : 'Comptes indisponibles pour le moment : vous jouez en invité.'}
        </p>
      </section>
    )
  }

  if (a.status === 'signedOut') {
    return (
      <section className="card account-card account-card--guest">
        <b>Vous jouez en invité</b>
        <p className="muted">
          Connectez-vous pour garder votre progression sur tous vos appareils et entrer dans les classements.
        </p>
        <button type="button" className="google" onClick={a.signIn}>
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
            />
          </svg>
          Continuer avec Google
        </button>
      </section>
    )
  }

  return (
    <section className="card account-card">
      <div className="account-card__who">
        <Avatar user={a.user} size={56} />
        <div>
          <b>{a.pseudo ?? a.user.name}</b>
          {title && <span className="row__title">{title}</span>}
          <small className="muted">{a.user.email}</small>
        </div>
      </div>
      <div className={`account-card__sync account-card__sync--${a.sync.state}`}>
        <span>{syncLabel(a.sync)}</span>
        <button type="button" onClick={a.syncNow} disabled={a.sync.state === 'syncing'}>
          Synchroniser
        </button>
      </div>
      <div className="account-card__actions">
        <button type="button" onClick={() => a.openDialog('pseudo')}>
          {a.pseudo ? 'Changer de pseudo' : 'Choisir un pseudo'}
        </button>
        <button type="button" onClick={a.signOut}>
          Se déconnecter
        </button>
      </div>
      {a.pseudo && (
        <button type="button" className="link-button" onClick={a.leaveLeaderboard}>
          Ne plus apparaître dans les classements
        </button>
      )}
    </section>
  )
}

function Stats() {
  const { stats, progression, byMode } = usePoule(
    useShallow((state) => ({ stats: state.stats, progression: state.progression, byMode: state.byMode })),
  )
  if (!stats || !progression) return null
  const figures = [
    ['Parties', count(stats.played)],
    ['Gagnées', stats.played ? percent(stats.won / stats.played) : '—'],
    ['Record', stats.bestMultiplier ? multiplierLabel(stats.bestMultiplier) : '—'],
    ['Misé', tokens(stats.wageredCents)],
    ['Résultat', signedTokens(stats.returnedCents - stats.wageredCents)],
    ['Retour observé', stats.wageredCents ? percent(stats.returnedCents / stats.wageredCents) : '—'],
  ]
  return (
    <section className="card">
      <div className="level-line">
        <span className="level-line__badge">Niv. {progression.level}</span>
        <div className="bar bar--light" aria-hidden="true">
          <span style={{ width: `${Math.round(progression.ratio * 100)}%` }} />
        </div>
        <small className="muted">
          {progression.needed ? `${count(progression.into)} / ${count(progression.needed)} XP` : 'Max'}
        </small>
      </div>
      <dl className="figures">
        {figures.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {byMode.length > 0 && (
        <p className="note">
          {MODES.filter((mode) => byMode.some((entry) => entry.mode_id === mode.id))
            .map((mode) => {
              const entry = byMode.find((line) => line.mode_id === mode.id)
              return `${mode.label} ${count(entry.won)}/${count(entry.played)}`
            })
            .join(' · ')}
        </p>
      )}
    </section>
  )
}

function Achievements() {
  const unlocked = usePoule((state) => state.progression?.achievements ?? NONE)
  return (
    <ul className="achievements">
      {ACHIEVEMENTS.map((achievement) => {
        const done = unlocked.includes(achievement.id)
        return (
          <li key={achievement.id} className={done ? 'is-done' : undefined}>
            <b>{achievement.label}</b>
            <small>{achievement.hint}</small>
            <span>
              <FeatherIcon size={12} /> {achievement.reward}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Fairness() {
  const { round, reveal } = usePoule(useShallow((state) => ({ round: state.round, reveal: state.reveal })))
  const hash = round?.seedHash ?? reveal?.seedHash ?? '—'
  let seed = '—'
  if (round) seed = '(secrète pendant la partie)'
  else if (reveal) {
    seed = `${reveal.seed} — ${reveal.fatalLane ? `première voie fatale : ${reveal.fatalLane}` : 'aucune voie fatale'}`
  }
  return (
    <details className="card details">
      <summary>Équité vérifiable</summary>
      <p>
        Avant chaque partie, le jeu tire une graine secrète et affiche son empreinte SHA-256. La voie n est franchie si
        les 8 premiers caractères de SHA-256(graine:n), lus comme un nombre et divisés par 2³², sont inférieurs à la
        chance de passage du mode.
      </p>
      <small className="muted">Empreinte de la partie</small>
      <code>{hash}</code>
      <small className="muted">Graine révélée en fin de partie</small>
      <code>{seed}</code>
    </details>
  )
}

export default function ProfileScreen({ hidden }) {
  const p = usePoule(
    useShallow((state) => ({
      sound: state.sound,
      haptics: state.haptics,
      inRound: Boolean(state.round),
      toggleSound: state.toggleSound,
      toggleHaptics: state.toggleHaptics,
      clearStats: state.clearStats,
    })),
  )
  const unlocked = usePoule((state) => state.progression?.achievements.length ?? 0)

  return (
    <main className="screen screen--profile" hidden={hidden}>
      <h1 className="screen__title">Profil</h1>
      <AccountCard />

      <h2 className="section-title">Statistiques</h2>
      <Stats />

      <h2 className="section-title">
        Succès{' '}
        <small className="muted">
          {unlocked} / {ACHIEVEMENTS.length}
        </small>
      </h2>
      <Achievements />

      <h2 className="section-title">Réglages</h2>
      <section className="card">
        <Switch label="Son" checked={p.sound} onChange={p.toggleSound} />
        {'vibrate' in navigator && <Switch label="Vibrations" checked={p.haptics} onChange={p.toggleHaptics} />}
      </section>

      <h2 className="section-title">À savoir</h2>
      <Fairness />
      <details className="card details">
        <summary>Jeu responsable</summary>
        <p>
          Ce jeu reverse en moyenne {percent(RTP)} des mises : sur la durée, le solde baisse. Les jetons sont fictifs et
          ne valent rien.
        </p>
        <p>
          Les casinos en ligne sont interdits en France. Besoin d’aide : Joueurs Info Service,{' '}
          <a className="nowrap" href="tel:0974751313">
            09 74 75 13 13
          </a>{' '}
          (appel non surtaxé, 7j/7, de 8 h à 2 h).
        </p>
      </details>

      <button type="button" className="danger" onClick={p.clearStats} disabled={p.inRound}>
        Effacer l’historique et les statistiques
      </button>
      <a className="back-link" href="/">
        ← Retour au portfolio
      </a>
    </main>
  )
}
