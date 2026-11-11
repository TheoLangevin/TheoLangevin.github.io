import './Facts.css'
import { stack } from '../content.js'

export default function Facts() {
  return (
    <section className="row" aria-label="About">
      <div className="tile tile--dark fact">
        <h2 className="label">Education</h2>
        <div>
          <p className="fact__big">ENSISA</p>
          <p className="fact__sub">Engineering degree, Mulhouse</p>
        </div>
      </div>
      <div className="tile stack">
        <h2 className="label">Stack</h2>
        <ul className="chips">
          {stack.map((skill) => (
            <li key={skill} className="chip">
              {skill}
            </li>
          ))}
        </ul>
      </div>
      <div className="tile tile--yellow fact">
        <h2 className="label">Motto</h2>
        <p className="fact__quote">Nothing is impossible if you just work hard enough at it.</p>
      </div>
    </section>
  )
}
