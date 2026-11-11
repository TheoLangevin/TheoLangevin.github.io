import './Projects.css'
import { projects } from '../content.js'

export default function Projects() {
  return (
    <section id="projects" className="projects" aria-label="Projects">
      {projects.map((project) => (
        <article key={project.title} className="tile project">
          <img className="project__image" src={project.image} alt={project.alt} loading="lazy" />
          <div className="project__body">
            <span className="project__tags">{project.tags}</span>
            <h2 className="project__title">{project.title}</h2>
            <p className="project__text">{project.description}</p>
          </div>
        </article>
      ))}
    </section>
  )
}
