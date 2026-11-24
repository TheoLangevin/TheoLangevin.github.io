import { useState } from 'react'
import { useAccount } from '../../state/useAccount.js'

/** Field to pick or change the public pseudo, with its error message. */
export default function PseudoForm({ initial = '', submitLabel = 'Enregistrer', onDone }) {
  const choosePseudo = useAccount((state) => state.choosePseudo)
  const [value, setValue] = useState(initial)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    const message = await choosePseudo(value)
    setSaving(false)
    setError(message)
    if (!message) onDone?.()
  }

  return (
    <form className="pseudo" onSubmit={submit} noValidate>
      <label htmlFor="pseudo">Pseudo public</label>
      <div className="pseudo__row">
        <input
          id="pseudo"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={16}
          autoComplete="nickname"
          autoCapitalize="off"
          spellCheck="false"
          aria-invalid={Boolean(error)}
          aria-describedby="pseudo-help"
        />
        <button type="submit" disabled={saving || value.trim() === initial}>
          {saving ? '…' : submitLabel}
        </button>
      </div>
      <small id="pseudo-help" className={error ? 'pseudo__error' : undefined}>
        {error ?? '3 à 16 caractères : lettres, chiffres, - ou _. Visible dans le classement.'}
      </small>
    </form>
  )
}
