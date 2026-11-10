import { useEffect, useRef, useState } from 'react'

/**
 * Returns [ref, inView]. `inView` flips to true the first time the element
 * enters the viewport and stays true (one-shot reveal animations).
 */
export default function useInView(threshold = 0.25) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}

export const revealClass = (inView) => `reveal${inView ? ' reveal--visible' : ''}`
