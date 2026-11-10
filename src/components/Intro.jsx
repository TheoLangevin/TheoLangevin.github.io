import Arrow from './Arrow.jsx'

export default function Intro({ ready }) {
  return (
    <header className="header">
      <div className={`introduction${ready ? ' introduction--is-ready' : ''}`}>
        <h1 className="introduction__content">
          <span className="introduction__content-el introduction__content-el--name">Théo Langevin</span>
          <span className="introduction__content-el introduction__content-el--description">IT Student</span>
          <span className="introduction__content-el introduction__content-el--job">Portfolio</span>
        </h1>
        <Arrow direction="down" className="introduction__arrow" />
      </div>
    </header>
  )
}
