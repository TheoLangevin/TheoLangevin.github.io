import { useState } from 'react'
import useInView, { revealClass } from '../useInView.js'
import { CONTACT_EMAIL } from '../data.js'
import map from '../assets/map.png'

const EMPTY = { name: '', email: '', message: '' }

export default function Contact() {
  const [ref, inView] = useInView(0.2)
  const [form, setForm] = useState(EMPTY)

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  // No backend: open the visitor's mail client with the message pre-filled.
  const submit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Contact Form — ${form.name}`)
    const body = encodeURIComponent(`From: ${form.name} <${form.email}>\n\n${form.message}`)
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <section ref={ref} id="contact" className={`contact ${revealClass(inView)}`}>
      <h2 className="contact__heading title">Contact Me</h2>
      <div className="contact__wrapper wrapper--large">
        <div className="contact__visual">
          <img src={map} alt="Théo Langevin's location" width="604" height="558" loading="lazy" />
        </div>
        <form className="contact__form" onSubmit={submit}>
          <input
            className="contact__form-el contact__form-el--name"
            name="name"
            type="text"
            placeholder="Your Name"
            aria-label="Your name"
            autoComplete="name"
            spellCheck="false"
            required
            value={form.name}
            onChange={update}
          />
          <input
            className="contact__form-el contact__form-el--email"
            name="email"
            type="email"
            placeholder="Your Email"
            aria-label="Your email"
            autoComplete="email"
            spellCheck="false"
            required
            value={form.email}
            onChange={update}
          />
          <textarea
            className="contact__form-el contact__form-el--message"
            name="message"
            placeholder="Your Message"
            aria-label="Your message"
            required
            value={form.message}
            onChange={update}
          />
          <input className="contact__form-el contact__form-el--submit" type="submit" value="Send" />
        </form>
      </div>
    </section>
  )
}
