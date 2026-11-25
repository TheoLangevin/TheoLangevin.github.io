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
  beanie: (
    <g>
      <path d="M38 21q0-15 14-15t14 15z" fill="#e8392c" />
      <rect x="37" y="17" width="30" height="6" rx="3" fill="#b8261b" />
      <circle cx="52" cy="5" r="4.5" fill="#fff" />
    </g>
  ),
  beret: (
    <g>
      <ellipse cx="50" cy="13" rx="15" ry="6" fill="#1d2a5c" transform="rotate(-10 50 13)" />
      <rect x="49" y="4" width="2.5" height="5" rx="1" fill="#1d2a5c" />
    </g>
  ),
  'party-hat': (
    <g>
      <path d="M43 17l11-25 10 25z" fill="#8e44ad" />
      <path d="M46 10l14 3M49 3l9 2" stroke="#ffc21a" strokeWidth="2.5" />
      <circle cx="54" cy="-8" r="3.5" fill="#ffc21a" />
    </g>
  ),
  chef: (
    <g>
      <circle cx="44" cy="6" r="7" fill="#fff" />
      <circle cx="52" cy="2" r="8" fill="#fff" />
      <circle cx="60" cy="6" r="7" fill="#fff" />
      <rect x="41" y="7" width="22" height="11" rx="2" fill="#fff" stroke="#d9d4c7" strokeWidth="1" />
    </g>
  ),
  cowboy: (
    <g>
      <path d="M42 16q0-14 10-13q10-1 10 13z" fill="#a0672f" />
      <rect x="42" y="11" width="20" height="3.5" fill="#5a3a1a" />
      <path d="M31 17q21 6 42 0q-3 4-21 5q-18-1-21-5z" fill="#8b5a2b" />
    </g>
  ),
  pirate: (
    <g>
      <path d="M33 17q19-26 38 0q-19-6-38 0z" fill="#1d1d1d" />
      <circle cx="52" cy="7" r="3" fill="#fff" />
      <path d="M49.5 11l5 0" stroke="#fff" strokeWidth="1.5" />
    </g>
  ),
  'top-hat': (
    <g>
      <rect x="43" y="-7" width="18" height="22" rx="1.5" fill="#1a1a1a" />
      <rect x="43" y="9" width="18" height="3.5" fill="#e8392c" />
      <ellipse cx="52" cy="15" rx="15" ry="3.5" fill="#111" />
    </g>
  ),
  viking: (
    <g>
      <path d="M39 14q-10-4-9-15q4 9 11 11z" fill="#f2e6c9" stroke="#c9b98f" strokeWidth="1" />
      <path d="M65 14q10-4 9-15q-4 9-11 11z" fill="#f2e6c9" stroke="#c9b98f" strokeWidth="1" />
      <path d="M38 20q0-14 14-14t14 14z" fill="#9aa3ad" />
      <rect x="37" y="17" width="30" height="5" rx="2" fill="#6b737c" />
      <circle cx="44" cy="19.5" r="1.2" fill="#c9ced4" />
      <circle cx="52" cy="19.5" r="1.2" fill="#c9ced4" />
      <circle cx="60" cy="19.5" r="1.2" fill="#c9ced4" />
    </g>
  ),
  wizard: (
    <g>
      <path d="M41 18l17-29 8 29z" fill="#3b2a7a" />
      <ellipse cx="53" cy="18" rx="17" ry="3.5" fill="#2c1f5e" />
      <circle cx="53" cy="4" r="1.6" fill="#ffd84a" />
      <circle cx="57" cy="11" r="1.2" fill="#ffd84a" />
      <circle cx="49" cy="12" r="1" fill="#ffd84a" />
    </g>
  ),
  cone: (
    <g>
      <path d="M45.5 16L52 -16l6.5 32z" fill="#ff7a1a" />
      <path d="M48.4 2.5h7.2l1.2 6h-9.6z M50.2 -6.5h3.6l.9 4.5h-5.4z" fill="#fff" />
      <path d="M52 -16l6.5 32h-3z" fill="#00000022" />
      <rect x="39" y="14" width="26" height="5" rx="1.5" fill="#e85d00" />
    </g>
  ),
  santa: (
    <g>
      <path d="M40 21q4-16 18-14q8 2 12 12l-4 2q-3-7-9-8z" fill="#e8392c" />
      <circle cx="68" cy="22" r="4" fill="#fff" />
      <rect x="37" y="18" width="32" height="6" rx="3" fill="#fff" />
    </g>
  ),
  halo: <ellipse cx="52" cy="4" rx="12" ry="3.5" fill="none" stroke="#ffd84a" strokeWidth="3" />,
  laurel: (
    <g fill="#3c9a4a">
      {[0, 1, 2, 3].map((i) => (
        <ellipse
          key={`l${i}`}
          cx={42 + i * 2}
          cy={19 - i * 4}
          rx="4"
          ry="2"
          transform={`rotate(${-50 + i * 15} ${42 + i * 2} ${19 - i * 4})`}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <ellipse
          key={`r${i}`}
          cx={62 - i * 2}
          cy={19 - i * 4}
          rx="4"
          ry="2"
          transform={`rotate(${50 - i * 15} ${62 - i * 2} ${19 - i * 4})`}
        />
      ))}
      <circle cx="52" cy="5" r="2" fill="#ffc21a" />
    </g>
  ),
}

const NECK = {
  'xmas-scarf': (
    <g>
      <path d="M41 36q12 6 22-1l1 5q-11 8-23 1z" fill="#1f9d55" />
      <path d="M44 38l3 1M50 39.5l3 0M56 38.5l3-1" stroke="#e8392c" strokeWidth="2.4" />
      <path d="M46 41l-3 10 5 1 2-10z" fill="#e8392c" />
    </g>
  ),
  'bow-tie': (
    <g>
      <path d="M53 40l-8-5v10zM53 40l8-5v10z" fill="#e8392c" />
      <circle cx="53" cy="40" r="2.2" fill="#b8261b" />
    </g>
  ),
  scarf: (
    <g>
      <path d="M41 36q12 6 22-1l1 5q-11 8-23 1z" fill="#2f7de1" />
      <path d="M46 41l-3 10 5 1 2-10z" fill="#1f5fb8" />
    </g>
  ),
  bell: (
    <g>
      <path d="M42 37q11 6 21-1" stroke="#8b5a2b" strokeWidth="3" fill="none" />
      <path d="M49 45q0-5 4-5t4 5l1 2h-10z" fill="#ffc21a" />
      <circle cx="53" cy="48" r="1.3" fill="#b88600" />
    </g>
  ),
  'gold-chain': (
    <g>
      <path d="M41 37q12 10 23-1" stroke="#ffcf33" strokeWidth="2.6" strokeDasharray="2.2 1.4" fill="none" />
      <circle cx="53" cy="45" r="3.2" fill="#ffcf33" stroke="#e0a400" strokeWidth="1" />
    </g>
  ),
  medal: (
    <g>
      <path d="M47 35l6 9 6-9" stroke="#2f7de1" strokeWidth="4" fill="none" />
      <circle cx="53" cy="47" r="5" fill="#ffc21a" stroke="#b88600" strokeWidth="1.2" />
      <path d="M53 44.5l.8 1.7 1.9.2-1.4 1.3.4 1.9-1.7-1-1.7 1 .4-1.9-1.4-1.3 1.9-.2z" fill="#fff6c4" />
    </g>
  ),
}

/** Hats that leave the comb visible. */
const COMB_SHOWS = new Set([null, 'shades', 'crown', 'halo', 'laurel'])

/**
 * The hen, seen from the side, facing the road. `colors` are her feathers:
 * two colours (body, shade) or more for a gradient. `hat` and `neck` are ids
 * of shop items.
 */
export function HenSprite({ colors = ['#ffffff', '#e4e1d6'], hat = null, neck = null, skin = null }) {
  if (skin === 'roadworks') return <ConeSprite neck={neck} />
  return <Hen colors={colors} hat={hat} neck={neck} />
}

function Hen({ colors, hat, neck }) {
  const gradient = useId()
  const gradientFill = colors.length > 2
  const body = gradientFill ? `url(#${gradient})` : colors[0]
  const shade = gradientFill ? '#00000030' : colors[1]
  return (
    <svg viewBox="0 -14 88 94" aria-hidden="true">
      {gradientFill && (
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            {colors.map((color, index) => (
              <stop key={color} offset={index / (colors.length - 1)} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
      )}
      <path d="M30 64v10M44 64v10M26 74h8M40 74h8" stroke="#f08a24" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="38" cy="46" rx="24" ry="21" fill={body} />
      <path d="M18 40q-10-8-8 6q6 6 14 2z" fill={shade} />
      <path d="M28 46q10 14 22 2q-8 2-22-2z" fill={shade} />
      <circle cx="52" cy="26" r="13" fill={body} />
      {COMB_SHOWS.has(hat) && <path d="M46 14q2-8 6-2q3-7 6 0q4-4 3 4z" fill="#e8392c" />}
      <path d="M64 26l9 3-9 4z" fill="#f08a24" />
      <path d="M60 34q2 7-3 7q-2-4 0-7z" fill="#e8392c" />
      <circle cx="56" cy="23" r="2.6" fill="#1d1a12" />
      <circle cx="57" cy="22" r=".9" fill="#fff" />
      {neck && NECK[neck]}
      {hat && HATS[hat]}
    </svg>
  )
}

/**
 * The "Chantier" skin: the hen is a traffic cone with eyes, a beak and the
 * hen's feet. She keeps her neck item; a hat would not fit on the tip.
 */
function ConeSprite({ neck }) {
  return (
    <svg viewBox="0 -14 88 94" aria-hidden="true">
      <path d="M33 64v10M47 64v10M29 74h8M43 74h8" stroke="#f08a24" strokeWidth="4" strokeLinecap="round" fill="none" />
      <rect x="18" y="58" width="48" height="9" rx="3" fill="#d95400" />
      <path d="M29 60L40 -6h4l11 66z" fill="#ff7a1a" />
      <path d="M44 -6l11 66h-6z" fill="#00000022" />
      <path d="M33.5 34h17l2 12h-21z M37 14h10l1.6 9.5h-13.2z" fill="#fff" />
      <circle cx="40" cy="27" r="3.2" fill="#fff" />
      <circle cx="47" cy="27" r="3.2" fill="#fff" />
      <circle cx="41" cy="27.4" r="1.7" fill="#1d1a12" />
      <circle cx="48" cy="27.4" r="1.7" fill="#1d1a12" />
      <path d="M50 31l7 2-7 3z" fill="#f08a24" />
      <path d="M37 -6q3-6 5 0q2-6 5 0z" fill="#e8392c" />
      {neck && <g transform="translate(-10 14)">{NECK[neck]}</g>}
    </svg>
  )
}

/** A yellow bulldozer seen from above, blade first: the traffic of the "Chantier" skin. */
export function BulldozerSprite() {
  return (
    <svg viewBox="0 0 54 92" aria-hidden="true">
      <rect x="1" y="14" width="11" height="70" rx="4" fill="#2b2b2b" />
      <rect x="42" y="14" width="11" height="70" rx="4" fill="#2b2b2b" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect key={i} x="1" y={17 + i * 7.6} width="52" height="2" fill="#444" />
      ))}
      <rect x="9" y="18" width="36" height="62" rx="6" fill="#ffc21a" />
      <rect x="13" y="22" width="28" height="22" rx="4" fill="#1c2230" />
      <rect x="15" y="24" width="10" height="8" rx="2" fill="#ffffff40" />
      <rect x="14" y="50" width="26" height="4" rx="2" fill="#e0a400" />
      <rect x="14" y="58" width="26" height="4" rx="2" fill="#e0a400" />
      <rect x="22" y="66" width="10" height="10" rx="2" fill="#555" />
      <path d="M17 80h20v4H17z" fill="#888" />
      <path d="M2 84h50l-3 7H5z" fill="#9aa0a8" />
      <path d="M2 84h50v2H2z" fill="#c9ced6" />
      <rect x="15" y="10" width="6" height="8" rx="2" fill="#ff7a1a" />
    </svg>
  )
}

/** A car seen from above, driving down the screen. */
export function CarSprite({ color, skin = null }) {
  if (skin === 'roadworks') return <BulldozerSprite />
  return <Car color={color} />
}

function Car({ color }) {
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
