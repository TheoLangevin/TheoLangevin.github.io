import Navigation from './components/Navigation.jsx'
import Hero from './components/Hero.jsx'
import Facts from './components/Facts.jsx'
import Projects from './components/Projects.jsx'
import Experience from './components/Experience.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'

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
