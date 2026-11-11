import greenShare from './assets/Green.png'
import bugCastle from './assets/BugCastle.png'
import abalone from './assets/abalone.jpg'
import connect4 from './assets/connect4.png'

export const CONTACT_EMAIL = 'theolangevin3@gmail.com'

export const navLinks = [
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Play Shardstorm', href: '/game.html' },
]

export const stack = ['C', 'C++', 'Java', 'Python', 'Kotlin', 'HTML', 'CSS', 'Spring', 'JUnit', 'Selenium']

export const projects = [
  {
    title: 'GreenShare',
    tags: 'Kotlin · Mobile',
    description: 'Project manager and developer of a blog mobile application.',
    image: greenShare,
    alt: 'GreenShare app on a phone',
  },
  {
    title: 'BugCastle',
    tags: 'Java · Spring · Selenium',
    description: 'Team-built Java web application, tested with JUnit and Selenium.',
    image: bugCastle,
    alt: 'BugCastle web application',
  },
  {
    title: 'Abalone',
    tags: 'C · Game AI',
    description: 'The board game with a graphical interface and an AI, in a team of 9.',
    image: abalone,
    alt: 'Abalone board game',
  },
  {
    title: 'Connect 4',
    tags: 'Java · Game AI',
    description: 'The game with a graphical interface and an AI, in a team of 2.',
    image: connect4,
    alt: 'Connect 4 game screen',
  },
]

export const experiences = [
  {
    title: 'IT Trainee',
    place: 'Angers Loire Habitat',
    description:
      'Set up a Centreon supervision and alert system on the company’s servers, VMs and boxes.',
  },
  {
    title: 'Service desk agent',
    place: 'CATS · Helpline Angers',
    description: 'Handled calls from bankers and solved their software and technical problems.',
  },
  {
    title: 'Youth worker',
    place: 'Summer camp',
    description: 'Camp leader in charge of activities and planning.',
  },
]
