const PATHS = {
  down: 'M22.2 634c-50-35-40-47 293-349 174-157 323-285 333-285 24 0 635 552 647 585 8 23 6 30-14 46 -13 10-31 19-40 19s-57-37-107-83c-50-45-179-162-287-260l-197-179 -147 134c-319 289-433 388-446 388C50.2 650 34.2 643 22.2 634z',
  up: 'M315.4 365c-336-305-345-315-290-351 18-12 32-14 45-8 10 5 145 123 300 262l281 253 196-178c108-98 237-215 287-260 50-46 98-83 107-83s27 9 40 19c20 16 22 23 14 46 -12 33-623 585-647 585C638.4 650 489.4 522 315.4 365z',
}

export default function Arrow({ direction = 'down', className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 65" aria-hidden="true">
      <g transform="translate(0,65) scale(0.1,-0.1)">
        <path d={PATHS[direction]} />
      </g>
    </svg>
  )
}
