import { CONTACT_EMAIL } from '../data.js'

export default function Contact() {
  return (
    <section id="contact" className="tile tile--dark contact">
      <h2 className="label">Contact</h2>
      <p className="contact__title">Let’s work together.</p>
      <a className="button button--light" href={`mailto:${CONTACT_EMAIL}`}>
        Send me an email
      </a>
    </section>
  )
}
