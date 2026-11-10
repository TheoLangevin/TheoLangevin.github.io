export default function Splashscreen({ hidden }) {
  return (
    <div className={`splashscreen${hidden ? ' splashscreen--is-hidden' : ''}`} aria-hidden="true">
      <div className="preloader">
        <span className="preloader__text">Loading</span>
      </div>
    </div>
  )
}
