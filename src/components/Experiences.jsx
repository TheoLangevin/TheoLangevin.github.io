import useInView, { revealClass } from '../useInView.js'
import { experiences } from '../data.js'

export default function Experiences() {
  const [ref, inView] = useInView(0.2)
  return (
    <section ref={ref} id="experiences" className={`blog ${revealClass(inView)}`}>
      <h2 className="blog__heading title">Experiences</h2>
      <div className="blog__wrapper wrapper--large">
        {experiences.map((xp) => (
          <article key={xp.title} className="blog__post">
            <div className="blog__post-thumbnail">
              <img src={xp.image} alt={xp.alt} width="370" height="259" loading="lazy" />
            </div>
            <div className="blog__post-excerpt">
              <h3>{xp.title}</h3>
              <p>{xp.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
