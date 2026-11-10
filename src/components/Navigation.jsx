import { navLinks } from '../data.js'

export default function Navigation() {
  return (
    <nav className="nav" aria-label="Main">
      <a className="nav__brand" href="#top">
        Théo Langevin
      </a>
      <div className="nav__links">
        {navLinks.map(({ label, href }) => (
          <a key={href} className="nav__link" href={href}>
            {label}
          </a>
        ))}
        <a className="nav__link nav__link--cta" href="#contact">
          Contact
        </a>
      </div>
    </nav>
  )
}
