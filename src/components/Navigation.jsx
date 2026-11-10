import { useEffect, useState } from 'react'
import { navLinks } from '../data.js'

export default function Navigation() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('nav-open', open)
    return () => document.body.classList.remove('nav-open')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = () => setOpen((o) => !o)

  return (
    <div id="top" className="navigation">
      <div className="navigation__wrapper wrapper--large">
        <a className="navigation__logo logo" href="#top">
          TL
        </a>
        <nav
          id="main-nav"
          className={`navigation__container${open ? ' navigation__container--is-open' : ''}`}
        >
          <ul className="navigation__list">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <a href={href} onClick={() => setOpen(false)}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="navigation__cta button" href="#contact">
          Contact me
        </a>
        <div
          className={`navigation__burger${open ? ' navigation__burger--is-open' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggle()
            }
          }}
        >
          <span className="navigation__burger-el navigation__burger-el--top" />
          <span className="navigation__burger-el navigation__burger-el--middle" />
          <span className="navigation__burger-el navigation__burger-el--bottom" />
        </div>
      </div>
    </div>
  )
}
