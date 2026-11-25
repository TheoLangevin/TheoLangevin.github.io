import { useShallow } from 'zustand/react/shallow'
import { STARTING_BALANCE } from '../../config/economy.js'
import { CURRENT_SEASON } from '../../config/seasons.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { tokens } from '../format.js'
import { CarSprite, HenSprite } from '../road/sprites.jsx'

/** Once, when this device enters a new big season: the reset, the new leagues, the beta gift. */
export default function SeasonIntro() {
  const { intro, close } = usePoule(useShallow((state) => ({ intro: state.seasonIntro, close: state.closeSeasonIntro })))
  if (!intro) return null
  const actions = (
    <button type="button" className="big big--play" onClick={close}>
      C’est parti !
    </button>
  )
  return (
    <Dialog title={`${CURRENT_SEASON.label} commence !`} onClose={close} actions={actions}>
      {intro.beta && (
        <div className="season-intro__gift" aria-hidden="true">
          <HenSprite skin="roadworks" />
          <CarSprite skin="roadworks" />
        </div>
      )}
      {intro.beta && (
        <p>
          <b>Merci d’avoir joué à la bêta !</b> Voici le skin exclusif <b>Chantier</b> : votre poule devient un plot et
          les voitures des bulldozers. Il est déjà équipé (Boutique → Skins pour le retirer).
        </p>
      )}
      <p>
        Tout le monde repart à égalité : <b>{tokens(STARTING_BALANCE)} jetons</b> pour chacun
        {intro.previousBalanceCents !== STARTING_BALANCE ? ` (vous en aviez ${tokens(intro.previousBalanceCents)})` : ''}.
        Votre niveau, vos objets et vos succès restent.
      </p>
      <ul className="season-intro__list">
        <li>
          <b>Ligues à divisions</b> : de Bronze III à Légende, avec des points de ligue qui montent et descendent chaque
          jour.
        </li>
        <li>
          <b>Défi du jour</b> : même mode et même mise pour tous, 3 essais, les meilleurs sont payés. Le week-end, il devient un tournoi.
        </li>
        <li>
          <b>Tapis</b> : vous pouvez désormais miser tous vos jetons d’un coup.
        </li>
      </ul>
    </Dialog>
  )
}
