/** Small inline icons, drawn with currentColor. */

export function FeatherIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d="M20 3c-7 0-13 5-14 13l-3 5h2l2-3c8-1 13-7 13-15z" fill="currentColor" opacity=".9" />
      <path d="M7 17c3-4 6-7 11-11" stroke="#0005" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function SoundIcon({ on, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {on ? (
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  )
}

export function LockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.4" fill="none" />
    </svg>
  )
}
