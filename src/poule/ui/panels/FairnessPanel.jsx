import { useShallow } from 'zustand/react/shallow'
import { usePoule } from '../../state/usePoule.js'

/** The hash shown before a round, the seed revealed after it. */
export default function FairnessPanel() {
  const { round, reveal } = usePoule(useShallow((state) => ({ round: state.round, reveal: state.reveal })))
  const hash = round?.seedHash ?? reveal?.seedHash ?? '—'

  let seed = '—'
  if (round) seed = '(secrète pendant la partie)'
  else if (reveal)
    seed = `${reveal.seed} — ${reveal.fatalLane ? `première voie fatale : ${reveal.fatalLane}` : 'aucune voie fatale'}`

  return (
    <section className="box panel">
      <h2>Équité vérifiable</h2>
      <p>
        Avant chaque partie, le jeu tire une graine secrète et affiche son empreinte SHA-256. La voie n est franchie si
        les 8 premiers caractères de SHA-256(graine:n), lus comme un nombre et divisés par 2³², sont inférieurs à la
        chance de passage du mode.
      </p>
      <p className="box__label">Empreinte de la partie</p>
      <code>{hash}</code>
      <p className="box__label">Graine révélée en fin de partie</p>
      <code>{seed}</code>
    </section>
  )
}
