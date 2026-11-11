import './overlay.css'

/** Dimmed full-screen layer holding one centred card (menus, modals). */
export default function Overlay({ label, wide = false, children }) {
  return (
    <div className="overlay">
      <section className={`card${wide ? ' card--wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </section>
    </div>
  )
}
