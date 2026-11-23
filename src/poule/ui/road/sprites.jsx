import { useId } from 'react'

const HATS = {
  cap: (
    <g>
      <path d="M40 22q2-14 14-14q12 0 13 13z" fill="#2f7de1" />
      <path d="M60 19h15q2 4-2 5H60z" fill="#1f5fb8" />
    </g>
  ),
  shades: (
    <g>
      <path d="M43 22h9" stroke="#111" strokeWidth="2" />
      <rect x="50" y="18.5" width="17" height="8" rx="3.5" fill="#111" />
      <rect x="53" y="20" width="5" height="2" rx="1" fill="#ffffff70" />
    </g>
  ),
  helmet: (
    <g>
      <path d="M38 21q1-16 15-16q14 0 15 16z" fill="#ffc21a" />
      <path d="M52 6v15" stroke="#e0a400" strokeWidth="3" />
      <rect x="36" y="19" width="34" height="4" rx="2" fill="#e0a400" />
    </g>
  ),
  crown: (
    <path
      d="M42 15l3-11 6 7 4-9 4 9 6-7 2 11z"
      fill="#ffc21a"
      stroke="#b88600"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  ),
}

/**
 * The hen, seen from the side, facing the road. `plumage` colours her
 * feathers ({ color, shade }); `hat` is the id of an upgrade from the shop.
 */
export function HenSprite({ plumage = { color: '#ffffff', shade: '#e4e1d6' }, hat = null }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M30 64v10M44 64v10M26 74h8M40 74h8" stroke="#f08a24" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="38" cy="46" rx="24" ry="21" fill={plumage.color} />
      <path d="M18 40q-10-8-8 6q6 6 14 2z" fill={plumage.shade} />
      <path d="M28 46q10 14 22 2q-8 2-22-2z" fill={plumage.shade} />
      <circle cx="52" cy="26" r="13" fill={plumage.color} />
      {hat !== 'helmet' && hat !== 'cap' && <path d="M46 14q2-8 6-2q3-7 6 0q4-4 3 4z" fill="#e8392c" />}
      <path d="M64 26l9 3-9 4z" fill="#f08a24" />
      <path d="M60 34q2 7-3 7q-2-4 0-7z" fill="#e8392c" />
      <circle cx="56" cy="23" r="2.6" fill="#1d1a12" />
      <circle cx="57" cy="22" r=".9" fill="#fff" />
      {hat && HATS[hat]}
    </svg>
  )
}

/** A car seen from above, driving down the screen. */
export function CarSprite({ color }) {
  const shine = useId()
  return (
    <svg viewBox="0 0 54 92" aria-hidden="true">
      <defs>
        <linearGradient id={shine}>
          <stop offset="0" stopColor="#fff" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
      </defs>
      <rect x="3" y="4" width="48" height="84" rx="14" fill={color} />
      <rect x="3" y="4" width="48" height="84" rx="14" fill={`url(#${shine})`} opacity=".35" />
      <rect x="9" y="20" width="36" height="14" rx="5" fill="#1c2230" />
      <rect x="10" y="58" width="34" height="18" rx="5" fill="#1c2230" />
      <rect x="11" y="36" width="32" height="20" rx="4" fill="#ffffff30" />
      <rect x="7" y="82" width="10" height="5" rx="2" fill="#fff6b0" />
      <rect x="37" y="82" width="10" height="5" rx="2" fill="#fff6b0" />
      <rect x="7" y="5" width="10" height="4" rx="2" fill="#ff4d3d" />
      <rect x="37" y="5" width="10" height="4" rx="2" fill="#ff4d3d" />
    </svg>
  )
}
