import { RTP } from '../../config/economy.js'
import { percent } from '../format.js'

/** What the game costs on average, and where to find help. */
export default function SafetyPanel() {
  return (
    <section className="box panel panel--warn">
      <h2>À savoir</h2>
      <p>
        Ce jeu reverse en moyenne {percent(RTP)} des mises, quelle que soit la difficulté : sur la durée, le solde
        baisse. Le bilan le montre. Les jetons sont fictifs et ne valent rien.
      </p>
      <p>
        Les casinos en ligne sont interdits en France. Besoin d’aide : Joueurs Info Service,{' '}
        <a className="nowrap" href="tel:0974751313">
          09 74 75 13 13
        </a>{' '}
        (appel non surtaxé, 7j/7, de 8 h à 2 h).
      </p>
    </section>
  )
}
