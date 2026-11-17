import portrait from '../../portfolio/assets/id2.png'
import { profile } from '../content/profile.js'
import { NODE_BY_ID, NODES, SECTOR_BY_ID } from '../content/world.js'
import { useMatrix } from '../state/useMatrix.js'
import HoloPanel from './HoloPanel.jsx'
import PortalLink from './PortalLink.jsx'

const firstProject = NODES.find((node) => node.kind === 'project')

function Action({ onClick, primary = false, children }) {
  return (
    <button
      type="button"
      className={`holo__button${primary ? ' holo__button--primary' : ''}`}
      onClick={onClick}
      data-autofocus={primary ? '' : undefined}
    >
      {children}
    </button>
  )
}

/* What each kind of node shows: `body` is the content, `actions` the buttons. */

const CONTENT = {
  identity: {
    body: () => (
      <div className="holo__split">
        <div className="holo__column">
          <p className="holo__tag">{profile.role}</p>
          <p className="holo__headline">
            {profile.headline[0]}
            <br />
            {profile.headline[1]}
          </p>
          <p className="holo__lead">{profile.lead}</p>
        </div>
        <figure className="holo__figure holo__figure--portrait">
          <img src={portrait} alt={`Portrait of ${profile.name}`} width="408" height="501" />
          <figcaption>SUBJECT // ID-00</figcaption>
        </figure>
      </div>
    ),
    actions: (_, { visit, openPanel }) => (
      <>
        {firstProject && (
          <Action primary onClick={() => visit(firstProject.id)}>
            See my projects
          </Action>
        )}
        <Action onClick={() => openPanel('contact')}>Get in touch</Action>
      </>
    ),
  },

  project: {
    body: (node) => (
      <>
        <p className="holo__tag">{node.data.tags}</p>
        <figure className="holo__figure">
          <img src={node.data.image} alt={node.data.alt} />
          <figcaption>
            CAPTURE // {node.code} · {node.index + 1} OF {NODES.filter((entry) => entry.kind === 'project').length}
          </figcaption>
        </figure>
        <p className="holo__lead">{node.data.description}</p>
      </>
    ),
  },

  experience: {
    body: (node) => (
      <>
        <p className="holo__tag">{node.data.place}</p>
        <p className="holo__lead">{node.data.description}</p>
      </>
    ),
  },

  stack: {
    body: (node) => (
      <>
        <p className="holo__lead">The languages and tools I build with.</p>
        <ul className="holo__chips">
          {node.data.map((skill) => (
            <li key={skill} className="holo__chip">
              {skill}
            </li>
          ))}
        </ul>
      </>
    ),
  },

  education: {
    body: (node) => (
      <>
        <p className="holo__tag">Education</p>
        <p className="holo__lead">{node.data.detail}</p>
      </>
    ),
  },

  motto: {
    title: () => 'Motto',
    body: (node) => <blockquote className="holo__quote">{node.data}</blockquote>,
  },

  contact: {
    title: () => profile.contactTitle,
    body: () => <p className="holo__lead">This channel opens your mail client with my address filled in.</p>,
    actions: (node) => (
      <PortalLink href={node.href} primary>
        {profile.contactAction}
      </PortalLink>
    ),
  },

  link: {
    body: (node) => <p className="holo__lead">{node.description}</p>,
    actions: (node) => (
      <PortalLink href={node.href} primary>
        {node.action}
      </PortalLink>
    ),
  },
}

/** The holographic window of one node of the world. */
export default function NodePanel({ id }) {
  const node = NODE_BY_ID[id]
  const closeOverlay = useMatrix((state) => state.closeOverlay)
  const visit = useMatrix((state) => state.visit)
  const openPanel = useMatrix((state) => state.openPanel)
  if (!node) return null

  const content = CONTENT[node.kind]
  const sector = SECTOR_BY_ID[node.sector]

  return (
    <HoloPanel
      key={id}
      path={`// ${sector.name} / ${sector.label}`}
      code={node.code}
      title={content.title?.(node) ?? node.title}
      closeHint="E"
      closeCodes={['Escape', 'KeyE']}
      onClose={closeOverlay}
      actions={content.actions?.(node, { visit, openPanel })}
    >
      {content.body(node)}
    </HoloPanel>
  )
}
