import { useMatrix } from '../state/useMatrix.js'

const isPlainClick = (event) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/**
 * A real link that leaves the experience. On a plain click the screen first
 * "switches off"; any other click (new tab, etc.) is left to the browser.
 * `mailto:` links open the mail client and never leave the page.
 */
export default function PortalLink({ href, primary = false, children }) {
  const leave = useMatrix((state) => state.leave)
  const staysOnPage = href.startsWith('mailto:')

  const onClick = (event) => {
    if (staysOnPage || !isPlainClick(event)) return
    event.preventDefault()
    leave(href)
  }

  return (
    <a
      className={`holo__button${primary ? ' holo__button--primary' : ''}`}
      href={href}
      onClick={onClick}
      data-autofocus={primary ? '' : undefined}
    >
      {children}
    </a>
  )
}
