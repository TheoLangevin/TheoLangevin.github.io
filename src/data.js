import greenShare from './assets/Green.png'
import bugCastle from './assets/BugCastle.png'
import abalone from './assets/abalone.jpg'
import connect4 from './assets/connect4.png'
import centreon from './assets/Centreon.png'
import cats from './assets/CATS.png'
import youth from './assets/Youth.png'

export const CONTACT_EMAIL = 'theolangevin3@gmail.com'

export const navLinks = [
  { label: 'Home', href: '#top' },
  { label: 'Portfolio', href: '#work' },
  { label: 'Experiences', href: '#experiences' },
  { label: 'Contact', href: '#contact' },
]

export const projects = [
  {
    title: ['GreenShare', 'Application'],
    description:
      'Project manager and developer in the creation of a blog mobile application: "GreenShare" in Kotlin',
    image: greenShare,
    alt: 'GreenShare',
  },
  {
    title: ['BugCastle', 'Web Java App'],
    description:
      'Development in a team of a test application in Java using Maven, Spring and others plugins. Testing the application with JUnit and Selenium.',
    image: bugCastle,
    alt: 'BugCastle',
  },
  {
    title: ['Abalone', 'Application'],
    description:
      'Development of the Abalone game in C language with an HMI and artificial intelligence in a team of 9 people.',
    image: abalone,
    alt: 'Abalone game',
  },
  {
    title: ['Connect 4', 'Application'],
    description:
      'Development of the Connect4 in Java language with an HMI and artificial intelligence in a team of 2 people.',
    image: connect4,
    alt: 'Connect 4',
  },
]

export const experiences = [
  {
    title: 'IT Trainee',
    description:
      'Trainee at Angers Loire Habitat : Implementation of a Centreon supervision and alert system on the company’s servers, VMs and boxes.',
    image: centreon,
    alt: 'Centreon logo',
  },
  {
    title: 'Service desk agent',
    description:
      'CATS hotline operator (Helpline Angers), Handling calls from bankers and solving their software and technical problems',
    image: cats,
    alt: 'CATS logo',
  },
  {
    title: 'Youth Worker',
    description: 'Summer camp leader, in charge of activities and planning.',
    image: youth,
    alt: 'Youth worker',
  },
]
