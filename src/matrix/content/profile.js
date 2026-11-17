/**
 * Profile texts shown by the classic site's Hero, Facts and Contact sections.
 *
 * They are written inline in those components (src/portfolio/sections), so they
 * are repeated here instead of changing the classic site to export them. A test
 * (content.test.js) fails if the two ever drift apart.
 */
export const profile = Object.freeze({
  name: 'Théo Langevin',
  role: 'IT engineering student · Mulhouse',
  headline: Object.freeze(['Hi, I’m Théo.', 'I build software.']),
  lead: 'Mobile apps, web applications and board games with their own AI, in C, C++, Java, Python and Kotlin.',
  education: Object.freeze({ school: 'ENSISA', detail: 'Engineering degree, Mulhouse' }),
  motto: 'Nothing is impossible if you just work hard enough at it.',
  contactTitle: 'Let’s work together.',
  contactAction: 'Send me an email',
})
