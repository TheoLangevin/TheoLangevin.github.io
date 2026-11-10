import { useEffect, useState } from 'react'
import Splashscreen from './components/Splashscreen.jsx'
import Navigation from './components/Navigation.jsx'
import Intro from './components/Intro.jsx'
import About from './components/About.jsx'
import Education from './components/Education.jsx'
import Skills from './components/Skills.jsx'
import Work from './components/Work.jsx'
import Experiences from './components/Experiences.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  // 'loading' -> 'hiding' (fade out) -> 'done' (removed, intro animates in)
  const [splash, setSplash] = useState('loading')

  useEffect(() => {
    let timer
    const hide = () => {
      setSplash('hiding')
      timer = setTimeout(() => setSplash('done'), 800)
    }
    if (document.readyState === 'complete') hide()
    else window.addEventListener('load', hide, { once: true })
    return () => {
      window.removeEventListener('load', hide)
      clearTimeout(timer)
    }
  }, [])

  return (
    <>
      {splash !== 'done' && <Splashscreen hidden={splash === 'hiding'} />}
      <Navigation />
      <Intro ready={splash === 'done'} />
      <main>
        <About />
        <h2 className="title section-title">About me</h2>
        <Education />
        <Skills />
        <Work />
        <Experiences />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
