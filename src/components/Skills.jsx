import useInView, { revealClass } from '../useInView.js'

export default function Skills() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className={`web-design ${revealClass(inView)}`}>
      <div className="web-design__wrapper wrapper--small">
        <div className="web-design__content blurb">
          <h2 className="blurb__heading">Skills and Experiences</h2>
          <p className="blurb__copy blurb__copy--tight">C, C++, Java, Python, HTML, CSS</p>
          <a className="transform-link" href="#experiences">
            Check it out
          </a>
        </div>
      </div>
      <figure className="web-design__visual" aria-hidden="true" />
    </section>
  )
}
