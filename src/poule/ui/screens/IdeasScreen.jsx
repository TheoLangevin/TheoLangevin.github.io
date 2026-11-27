import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ADMIN_EMAIL } from '../../config/admin.js'
import { useAccount } from '../../state/useAccount.js'
import { count } from '../format.js'
import './ideas.css'

const STATUSES = {
  new: { label: 'Nouvelle', tone: 'new' },
  planned: { label: 'Prévue', tone: 'planned' },
  done: { label: 'Faite ✓', tone: 'done' },
  declined: { label: 'Pas pour l’instant', tone: 'declined' },
}

const when = (ms) => {
  if (!ms) return ''
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60_000))
  if (minutes < 60) return `il y a ${minutes} min`
  if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`
  return `il y a ${Math.round(minutes / 1440)} j`
}

/** The idea box: players suggest what comes next, vote, and see what was done. */
export default function IdeasScreen({ go }) {
  const a = useAccount(
    useShallow((s) => ({
      status: s.status,
      pseudo: s.pseudo,
      me: s.user?.uid ?? null,
      admin: s.user?.email === ADMIN_EMAIL,
      ideas: s.ideas,
      load: s.loadIdeas,
      post: s.postIdea,
      vote: s.voteIdea,
      answer: s.answerIdea,
    })),
  )
  const [text, setText] = useState('')
  const [message, setMessage] = useState(null)
  const [sort, setSort] = useState('top')
  const ready = a.status !== 'loading' && a.status !== 'unavailable'

  useEffect(() => {
    if (ready) a.load()
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (event) => {
    event.preventDefault()
    const error = await a.post(text)
    if (error) setMessage({ kind: 'error', text: error })
    else {
      setText('')
      setMessage({ kind: 'ok', text: 'Merci ! Ton idée est dans la boîte 💡' })
    }
  }

  const list = [...a.ideas.list].sort((x, y) =>
    sort === 'top' ? y.votes.length - x.votes.length || y.createdAt - x.createdAt : y.createdAt - x.createdAt,
  )

  return (
    <main className="screen screen--ideas">
      <button type="button" className="link-button" onClick={() => go('profil')}>
        ← Profil
      </button>
      <h1 className="screen__title">💡 Boîte à idées</h1>
      <p className="note">
        Une idée pour le jeu ? Propose-la ici (3 par jour). Les idées sont lues toutes les heures, et les meilleures
        deviennent des mises à jour.
      </p>

      {a.status === 'signedIn' && a.pseudo ? (
        <form className="card ideas__form" onSubmit={send}>
          <textarea
            value={text}
            maxLength={500}
            rows={3}
            placeholder="Ex. : un monde sous-marin avec des poules plongeuses…"
            onChange={(event) => {
              setText(event.target.value)
              setMessage(null)
            }}
          />
          <div className="ideas__send">
            <small className="muted">{text.trim().length}/500</small>
            <button type="submit" className="coop-buy" disabled={text.trim().length < 5}>
              Envoyer
            </button>
          </div>
          {message && <p className={`ideas__message is-${message.kind}`}>{message.text}</p>}
        </form>
      ) : (
        <p className="card muted">Connecte-toi et choisis un pseudo (Profil) pour proposer et voter.</p>
      )}

      <div className="segmented ideas__sort" role="group" aria-label="Trier">
        <button type="button" aria-pressed={sort === 'top'} onClick={() => setSort('top')}>
          Les plus aimées
        </button>
        <button type="button" aria-pressed={sort === 'new'} onClick={() => setSort('new')}>
          Les plus récentes
        </button>
      </div>

      {a.ideas.error && <p className="note">{a.ideas.error}</p>}
      {!a.ideas.error && list.length === 0 && (
        <p className="note">{a.ideas.loading ? 'Chargement…' : 'Aucune idée pour l’instant : sois la première poule !'}</p>
      )}
      <ul className="ideas__list">
        {list.map((idea) => {
          const voted = a.me && idea.votes.includes(a.me)
          const status = STATUSES[idea.status] ?? STATUSES.new
          return (
            <li key={idea.id} className="card idea">
              <div className="idea__head">
                <b>{idea.pseudo}</b>
                <small className="muted">{when(idea.createdAt)}</small>
                <span className={`idea__status is-${status.tone}`}>{status.label}</span>
              </div>
              <p className="idea__text">{idea.text}</p>
              {idea.reply && <p className="idea__reply">🐓 {idea.reply}</p>}
              <div className="idea__foot">
                <button
                  type="button"
                  className={`idea__vote${voted ? ' is-on' : ''}`}
                  disabled={!a.me || voted || idea.uid === a.me}
                  onClick={() => a.vote(idea.id)}
                  aria-label={voted ? 'Déjà aimée' : 'J’aime cette idée'}
                >
                  ❤️ {count(idea.votes.length)}
                </button>
                {a.admin && <AdminAnswer idea={idea} answer={a.answer} />}
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

/** For the admin: mark an idea and reply. */
function AdminAnswer({ idea, answer }) {
  const [reply, setReply] = useState(idea.reply ?? '')
  return (
    <div className="idea__admin">
      <select value={idea.status} onChange={(event) => answer(idea.id, event.target.value, reply)}>
        {Object.entries(STATUSES).map(([id, s]) => (
          <option key={id} value={id}>
            {s.label}
          </option>
        ))}
      </select>
      <input value={reply} maxLength={300} placeholder="Réponse" onChange={(event) => setReply(event.target.value)} />
      <button type="button" className="coop-buy" onClick={() => answer(idea.id, idea.status, reply)}>
        OK
      </button>
    </div>
  )
}
