import { useState } from 'react'
import useInView, { revealClass } from '../useInView.js'
import { projects } from '../data.js'

export default function Work() {
  const [ref, inView] = useInView(0.2)
  const [active, setActive] = useState(0)

  return (
    <section ref={ref} id="work" className={`work ${revealClass(inView)}`}>
      <h2 className="work__heading title">My Projects</h2>
      <div className="work__wrapper wrapper--large">
        <ul className="work__list">
          {projects.map((project, i) => (
            <li
              key={project.alt}
              className={`work__list-el${i === active ? ' work__list-el--is-active' : ''}`}
            >
              <div className="work__content">
                <div className="work__content-blurb blurb blurb--framed">
                  <h3 className="blurb__heading">
                    {project.title[0]}
                    <br />
                    {project.title[1]}
                  </h3>
                  <p className="blurb__copy">{project.description}</p>
                </div>
              </div>
              <div className="work__visual">
                <img src={project.image} alt={project.alt} />
              </div>
            </li>
          ))}
        </ul>
        <ul className="work__navigation">
          {projects.map((project, i) => (
            <li
              key={project.alt}
              className={`work__navigation-el${i === active ? ' work__navigation-el--is-active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`Show project ${project.title.join(' ')}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(i)
                }
              }}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}
