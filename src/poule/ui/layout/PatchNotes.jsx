import { useEffect, useState } from 'react'
import { LATEST_NOTES, PATCH_NOTES } from '../../config/patchNotes.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import './patchNotes.css'

const KEY = 'poule_notes_seen'
const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return LATEST_NOTES
  }
}
const markSeen = () => {
  try {
    localStorage.setItem(KEY, LATEST_NOTES)
  } catch {
    // Private mode: the notes may show again, no harm.
  }
}

/** The notes newer than `seen` (all of them when `seen` is unknown). */
export const unseenNotes = (seen) => {
  const index = PATCH_NOTES.findIndex((note) => note.id === seen)
  return index < 0 ? PATCH_NOTES.slice(0, 1) : PATCH_NOTES.slice(0, index)
}

export function NotesList({ notes }) {
  return (
    <div className="notes">
      {notes.map((note) => (
        <section key={note.id} className="notes__entry">
          <h3>
            {note.title} <small className="muted">{note.date}</small>
          </h3>
          <ul>
            {note.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Once after an update: what is new since the last visit. New players skip it. */
export default function PatchNotes() {
  const ready = usePoule((state) => state.progression != null)
  const xp = usePoule((state) => state.progression?.xp ?? 0)
  const intro = usePoule((state) => Boolean(state.seasonIntro))
  const [notes, setNotes] = useState(null)

  useEffect(() => {
    if (!ready) return
    const seen = read()
    if (seen === LATEST_NOTES) return
    if (seen == null && xp === 0) return markSeen()
    setNotes(unseenNotes(seen))
  }, [ready, xp])

  if (!notes?.length || intro) return null
  const close = () => {
    markSeen()
    setNotes(null)
  }
  return (
    <Dialog
      title="Quoi de neuf ?"
      onClose={close}
      actions={
        <button type="button" className="big big--play" onClick={close}>
          Super !
        </button>
      }
    >
      <NotesList notes={notes} />
    </Dialog>
  )
}

/** Profil → Nouveautés: every note. */
export function AllNotes() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="card notes__open" onClick={() => setOpen(true)}>
        📰 Nouveautés <small className="muted">{PATCH_NOTES[0].title}</small>
      </button>
      {open && (
        <Dialog title="Nouveautés" onClose={() => setOpen(false)}>
          <NotesList notes={PATCH_NOTES} />
        </Dialog>
      )}
    </>
  )
}
