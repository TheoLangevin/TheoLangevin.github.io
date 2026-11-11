import './Experience.css'
import { experiences } from '../content.js'

export default function Experience() {
  return (
    <section id="experience" className="tile experience">
      <h2 className="label">Experience</h2>
      <ul className="experience__list">
        {experiences.map((xp) => (
          <li key={xp.title} className="experience__item">
            <h3 className="experience__title">
              {xp.title}
              <span className="experience__place">{xp.place}</span>
            </h3>
            <p className="experience__text">{xp.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
