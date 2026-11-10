import portrait from '../assets/id2.png'

export default function Hero() {
  return (
    <header className="row">
      <div className="tile hero">
        <span className="pill">IT engineering student · Mulhouse</span>
        <h1 className="hero__title">
          Hi, I’m Théo.
          <br />
          I build software.
        </h1>
        <p className="hero__lead">
          Mobile apps, web applications and board games with their own AI, in C, C++, Java, Python
          and Kotlin.
        </p>
        <div className="hero__actions">
          <a className="button button--accent" href="#projects">
            See my projects
          </a>
          <a className="button button--soft" href="#contact">
            Get in touch
          </a>
        </div>
      </div>
      <div className="tile tile--accent portrait">
        <img src={portrait} alt="Portrait of Théo Langevin" width="408" height="501" />
      </div>
    </header>
  )
}
