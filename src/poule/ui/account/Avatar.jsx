import { useState } from 'react'

/** The player's Google photo, or their initial on a coloured disc. */
export default function Avatar({ user, size = 32 }) {
  const [broken, setBroken] = useState(false)
  const initial = (user?.name ?? '?').trim().charAt(0).toUpperCase() || '?'
  if (user?.photo && !broken) {
    return (
      <img
        className="avatar"
        src={user.photo}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <span
      className="avatar avatar--initial"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}
