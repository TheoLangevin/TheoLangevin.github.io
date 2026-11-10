import useInView, { revealClass } from '../useInView.js'
import portrait from '../assets/id2.png'

export default function About() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className={`about ${revealClass(inView)}`}>
      <div className="about__wrapper wrapper--small">
        <div className="about__content">
          <div className="about__content-blurb blurb blurb--framed">
            <h2 className="blurb__heading">
              Nothing is
              <br />
              impossible
            </h2>
            <p className="blurb__copy no-margin">If you just work hard enough at it</p>
          </div>
          <p className="about__content-signature">Théo Langevin</p>
        </div>
        <img className="about__visual" src={portrait} alt="Théo Langevin" width="408" height="501" />
      </div>
    </section>
  )
}
