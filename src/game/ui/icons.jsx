/** Inline stroke icons, sized by the surrounding font size. */
function Icon({ children }) {
  return (
    <svg
      width="1.25em"
      height="1.25em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const PauseIcon = () => (
  <Icon>
    <path d="M8 5v14M16 5v14" />
  </Icon>
)

export const DashIcon = () => (
  <Icon>
    <path d="M13 5l7 7-7 7M4 12h15" />
  </Icon>
)
