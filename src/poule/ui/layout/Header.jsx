import { usePoule } from '../../state/usePoule.js'
import { tokens } from '../format.js'

export default function Header() {
  const balance = usePoule((state) => state.balanceCents)
  const ready = usePoule((state) => state.phase === 'ready')
  return (
    <header className="header">
      <div>
        <a className="header__back" href="/">
          ← Retour au portfolio
        </a>
        <h1>La Poule Traverse</h1>
        <p className="header__sub">Jeu de démonstration : jetons fictifs, aucun argent réel</p>
      </div>
      <div className="balance" aria-live="polite">
        <small>Solde</small>
        <b>{ready ? `${tokens(balance)} jetons` : '…'}</b>
      </div>
    </header>
  )
}
