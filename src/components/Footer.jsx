import Arrow from './Arrow.jsx'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__wrapper wrapper--large">
        <p className="footer__copyright no-margin">&copy; {new Date().getFullYear()} Théo Langevin</p>
        <a className="footer__logo logo" href="#top">
          TL
        </a>
        <a className="footer__arrow" href="#top" aria-label="Back to top">
          <Arrow direction="up" className="footer__arrow-el" />
        </a>
      </div>
    </footer>
  )
}
