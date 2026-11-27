import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ADMIN_EMAIL } from '../../config/admin.js'
import { useAccount } from '../../state/useAccount.js'
import { count, multiplierLabel, percent, tokens } from '../format.js'
import { eggs } from '../coop/format.js'
import './admin.css'

const dayLabel = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`

const ago = (ms) => {
  if (!ms) return '—'
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60_000))
  if (minutes < 60) return `il y a ${minutes} min`
  if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`
  return `il y a ${Math.round(minutes / 1440)} j`
}

function Kpi({ label, value, hint, tone }) {
  return (
    <div className={`kpi${tone ? ` kpi--${tone}` : ''}`}>
      <small>{label}</small>
      <b>{value}</b>
      {hint && <span>{hint}</span>}
    </div>
  )
}

/** Vertical bars, one per entry: { label, value }. */
function Bars({ data, format = count, title }) {
  const max = Math.max(1, ...data.map((entry) => entry.value))
  return (
    <figure className="bars" aria-label={title}>
      <div className="bars__plot">
        {data.map((entry) => (
          <div key={entry.label} className="bars__col" title={`${entry.label} : ${format(entry.value)}`}>
            <i style={{ height: `${Math.max(entry.value > 0 ? 4 : 0, (entry.value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="bars__labels" aria-hidden="true">
        {data.map((entry, index) => (
          <span key={entry.label}>{data.length > 8 && index % 2 ? '' : entry.label}</span>
        ))}
      </div>
      <figcaption>
        {title} · max {format(max)}
      </figcaption>
    </figure>
  )
}

/** Horizontal bars: { label, value, note }. */
function Rows({ rows, format = count }) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  return (
    <ul className="rows">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="rows__label">{row.label}</span>
          <span className="rows__bar">
            <i style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <b>{format(row.value)}</b>
          {row.note && <small>{row.note}</small>}
        </li>
      ))}
    </ul>
  )
}

function Section({ title, children }) {
  return (
    <section className="card admin__section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function PlayerLine({ player }) {
  return (
    <li>
      <span>
        <b>{player.pseudo}</b> <small>niv. {player.level}</small>
      </span>
      <span>{tokens(player.balanceCents)}</span>
      <small>{ago(player.lastSeen)}</small>
    </li>
  )
}

function Dashboard({ stats }) {
  const { players, rounds, economy, shop, achievements, seasons, flagged, leagues } = stats
  const rtpGap = rounds.rtp == null ? null : rounds.rtp - rounds.targetRtp
  return (
    <>
      <Section title="Joueurs">
        <div className="kpis">
          <Kpi label="Comptes" value={count(players.total)} hint={`${count(players.withPseudo)} avec pseudo`} />
          <Kpi label="Actifs 24 h" value={count(players.active24h)} />
          <Kpi label="Actifs 7 j" value={count(players.active7d)} hint={`${count(players.active30d)} sur 30 j`} />
          <Kpi label="Niveau moyen" value={players.avgLevel.toFixed(1).replace('.', ',')} />
        </div>
        <h3>Inscriptions par jour</h3>
        <Bars
          title="Nouveaux comptes"
          data={players.signupsByDay.map((d) => ({ label: dayLabel(d.day), value: d.count }))}
        />
        <h3>Joueurs actifs par jour</h3>
        <Bars
          title="Joueurs ayant fini une partie"
          data={players.activeByDay.map((d) => ({ label: dayLabel(d.day), value: d.count }))}
        />
        <h3>Niveaux</h3>
        <Rows rows={players.levels.map((bucket) => ({ label: `Niv. ${bucket.label}`, value: bucket.count }))} />
        <h3>Vus récemment</h3>
        <ul className="plist">{players.recent.map((player) => <PlayerLine key={player.uid} player={player} />)}</ul>
      </Section>

      <Section title="Parties">
        <div className="kpis">
          <Kpi label="Parties" value={count(rounds.total)} hint={`${count(rounds.won)} gagnées`} />
          <Kpi label="Victoires" value={rounds.winRate == null ? '—' : percent(rounds.winRate)} />
          <Kpi
            label="Retour joueurs"
            value={rounds.rtp == null ? '—' : percent(rounds.rtp)}
            hint={`cible ${percent(rounds.targetRtp)}`}
            tone={rtpGap != null && Math.abs(rtpGap) > 0.05 ? 'warn' : undefined}
          />
          <Kpi label="Voies par partie" value={rounds.avgLanes.toFixed(1).replace('.', ',')} hint={`${count(rounds.finished)} arrivées`} />
          <Kpi label="Misé" value={tokens(rounds.wagered)} hint={`moy. ${tokens(Math.round(rounds.avgBet))}`} />
          <Kpi label="Redistribué" value={tokens(rounds.returned)} />
          <Kpi label="Record" value={rounds.bestMultiplier ? multiplierLabel(rounds.bestMultiplier) : '—'} />
        </div>
        <h3>Parties par jour</h3>
        <Bars title="Parties" data={rounds.byDay.map((d) => ({ label: dayLabel(d.day), value: d.played }))} />
        <h3>Jetons misés par jour</h3>
        <Bars
          title="Jetons misés"
          format={(cents) => tokens(cents)}
          data={rounds.byDay.map((d) => ({ label: dayLabel(d.day), value: d.wagered }))}
        />
        <h3>Par mode</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Mode</th>
              <th>Parties</th>
              <th>Victoires</th>
              <th>Retour</th>
            </tr>
          </thead>
          <tbody>
            {rounds.byMode.map((mode) => (
              <tr key={mode.id}>
                <td>{mode.label}</td>
                <td>{count(mode.played)}</td>
                <td>{mode.winRate == null ? '—' : percent(mode.winRate)}</td>
                <td>{mode.rtp == null ? '—' : percent(mode.rtp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Gains encaissés (multiplicateur)</h3>
        <Rows rows={rounds.multipliers.map((bucket) => ({ label: bucket.label, value: bucket.count }))} />
        <h3>Taille des mises (jetons)</h3>
        <Rows rows={rounds.bets.map((bucket) => ({ label: bucket.label, value: bucket.count }))} />
        <p className="muted admin__note">Parties : les 1 000 dernières de chaque joueur (ce que garde une sauvegarde).</p>
      </Section>

      <Section title="Économie">
        <div className="kpis">
          <Kpi label="Jetons en circulation" value={tokens(economy.circulating)} />
          <Kpi label="Moyenne / médiane" value={`${tokens(economy.average)} / ${tokens(economy.median)}`} />
          <Kpi label="Plus riche" value={tokens(economy.richest)} />
          <Kpi label="Sous 200 jetons" value={count(economy.broke)} hint="peuvent se recharger" />
        </div>
        <h3>Les plus riches</h3>
        <ul className="plist">{players.top.map((player) => <PlayerLine key={player.uid} player={player} />)}</ul>
      </Section>

      <Section title="Boutique">
        <div className="kpis">
          <Kpi label="Achats" value={count(shop.purchases)} />
          <Kpi label="Jetons dépensés" value={tokens(shop.spentCents)} hint="estimation" />
        </div>
        <h3>Objets les plus possédés</h3>
        <Rows
          rows={shop.items.slice(0, 12).map((item) => ({
            label: item.label,
            value: item.owners,
            note: item.exclusive ? 'exclusif' : undefined,
          }))}
        />
        <h3>Jamais achetés</h3>
        <p className="admin__never">
          {shop.items.filter((item) => item.owners === 0 && !item.exclusive).map((item) => item.label).join(' · ') || 'Aucun'}
        </p>
      </Section>

      {stats.coop && <CoopSection coop={stats.coop} />}

      <Section title="Ligues">
        <Rows rows={(leagues ?? []).map((tier) => ({ label: tier.label, value: tier.count }))} />
        <p className="muted admin__note">Joueurs par ligue · {count(stats.beta ?? 0)} joueurs de la bêta (skin Chantier).</p>
      </Section>

      <Section title="Succès">
        <Rows rows={achievements.map((entry) => ({ label: entry.label, value: entry.count }))} />
      </Section>

      <Section title="Saisons">
        {seasons.length === 0 ? (
          <p className="muted">Aucune récompense réclamée pour l’instant.</p>
        ) : (
          <Rows rows={seasons.map((entry) => ({ label: entry.season, value: entry.count }))} />
        )}
        <p className="muted admin__note">Récompenses réclamées par saison.</p>
      </Section>

      <Section title="À surveiller">
        {flagged.length === 0 ? (
          <p className="muted">Rien d’anormal : aucun retour très au-dessus de la cible, aucun portefeuille démesuré.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Parties</th>
                <th>Retour</th>
                <th>Jetons</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((line) => (
                <tr key={line.uid}>
                  <td>{line.pseudo ?? 'Sans pseudo'}</td>
                  <td>{count(line.played)}</td>
                  <td>{line.rtp == null ? '—' : percent(line.rtp)}</td>
                  <td>{tokens(line.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted admin__note">
          Retour 1,5 fois au-dessus de la cible sur 30 parties ou plus, ou plus de 5 millions de jetons. Les scores sont
          calculés dans le navigateur des joueurs.
        </p>
      </Section>
    </>
  )
}

function CoopSection({ coop }) {
  return (
    <Section title="Poulailler">
      <div className="kpis">
        <Kpi
          label="Joueurs"
          value={count(coop.players)}
          hint={coop.share == null ? undefined : `${percent(coop.share)} des comptes`}
        />
        <Kpi label="Œufs pondus" value={eggs(coop.eggs)} hint={`${count(coop.taps)} touchers`} />
        <Kpi label="Marché aujourd’hui" value={`${tokens(coop.soldToday)} jetons`} hint={`${count(coop.sellersToday)} vendeurs`} />
        <Kpi label="Déménagements" value={count(coop.moves)} hint={`${count(coop.moved)} joueurs · ${count(coop.feathers)} plumes`} />
        <Kpi label="Œufs dorés" value={count(coop.golden)} />
        <Kpi label="Trophées" value={`${coop.trophiesAvg.toFixed(1).replace('.', ',')} / ${coop.trophiesTotal}`} hint="en moyenne" />
      </div>
      <h3>Jusqu’où vont les joueurs</h3>
      <Rows rows={coop.funnel.map((step) => ({ label: step.label, value: step.count }))} />
      <h3>Sortes de bâtiments possédées</h3>
      <Rows rows={coop.kinds.map((bucket) => ({ label: bucket.label, value: bucket.count }))} />
      <h3>Bâtiments</h3>
      <Rows
        rows={coop.buildings
          .filter((b) => b.owners > 0)
          .map((b) => ({ label: b.label, value: b.owners, note: `${count(b.total)} au total` }))}
      />
      <h3>Mondes ouverts</h3>
      <Rows rows={(coop.worlds ?? []).map((world) => ({ label: world.label, value: world.count }))} />
      <h3>Poules spéciales</h3>
      <Rows rows={coop.hens.map((hen) => ({ label: hen.label, value: hen.owners, note: `${count(hen.equipped)} installées` }))} />
      <h3>Looks achetés</h3>
      <Rows rows={coop.skins.map((skin) => ({ label: skin.label, value: skin.owners }))} />
      <h3>Meilleurs poulaillers</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Joueur</th>
            <th>Œufs</th>
            <th>Par s</th>
            <th>Bât.</th>
          </tr>
        </thead>
        <tbody>
          {coop.top.map((line) => (
            <tr key={line.uid}>
              <td>{line.pseudo}</td>
              <td>{eggs(line.eggs)}</td>
              <td>{eggs(line.pps)}</td>
              <td>
                {line.kinds}
                {line.moves ? ` · 🚚${line.moves}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted admin__note">D’après la dernière sauvegarde envoyée par chaque joueur connecté.</p>
    </Section>
  )
}

/** The stats dashboard, for the admin account only (the cloud refuses everyone else). */
export default function AdminScreen({ go }) {
  const { status, user, admin, load } = useAccount(
    useShallow((state) => ({ status: state.status, user: state.user, admin: state.admin, load: state.loadAdmin })),
  )
  const allowed = status === 'signedIn' && user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (allowed) load()
  }, [allowed, load])

  let body
  if (status === 'loading') body = <p className="note">Chargement…</p>
  else if (status !== 'signedIn') body = <p className="note">Connectez-vous avec le compte administrateur.</p>
  else if (!allowed) body = <p className="note">Cet écran est réservé à l’administrateur du jeu.</p>
  else if (admin.status === 'error') body = <p className="note">{admin.error}</p>
  else if (!admin.stats) body = <p className="note">Calcul des statistiques…</p>
  else body = <Dashboard stats={admin.stats} />

  return (
    <main className="screen screen--admin">
      <div className="admin__head">
        <h1 className="screen__title">Tableau de bord</h1>
        {allowed && (
          <button type="button" onClick={load} disabled={admin.status === 'loading'}>
            {admin.status === 'loading' ? 'Actualisation…' : 'Actualiser'}
          </button>
        )}
      </div>
      {allowed && admin.stats && (
        <p className="muted admin__note">
          Mis à jour {ago(admin.stats.generatedAt)}
          {admin.stats.unreadable > 0 ? ` · ${admin.stats.unreadable} sauvegarde(s) illisible(s)` : ''}
        </p>
      )}
      {body}
      <button type="button" className="link-button" onClick={() => go('profil')}>
        Retour au profil
      </button>
    </main>
  )
}
