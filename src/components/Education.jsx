import useInView, { revealClass } from '../useInView.js'

export default function Education() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className={`app-design ${revealClass(inView)}`}>
      <div className="app-design__wrapper wrapper--large">
        <div className="app-design__content blurb">
          <h2 className="blurb__heading">
            Engineer <br /> Formation
          </h2>
          <p className="blurb__copy blurb__copy--tight">Engineer formation at ENSISA, Mulhouse</p>
        </div>
      </div>
      <figure className="app-design__visual" role="img" aria-label="ENSISA logo" />
    </section>
  )
}
