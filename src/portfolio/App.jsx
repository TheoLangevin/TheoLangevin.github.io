import Navigation from './sections/Navigation.jsx'
import Hero from './sections/Hero.jsx'
import Facts from './sections/Facts.jsx'
import Projects from './sections/Projects.jsx'
import Experience from './sections/Experience.jsx'
import Contact from './sections/Contact.jsx'
import Footer from './sections/Footer.jsx'

export default function App() {
  return (
    <div className="page" id="top">
      <Navigation />
      <main className="bento">
        <Hero />
        <Facts />
        <Projects />
        <div className="row">
          <Experience />
          <Contact />
        </div>
      </main>
      <Footer />
    </div>
  )
}
