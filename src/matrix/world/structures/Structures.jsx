import { NODES, SECTORS } from '../../content/world.js'
import EducationPillar from './EducationPillar.jsx'
import ExperienceStele from './ExperienceStele.jsx'
import Floaters from './Floaters.jsx'
import IdentityCore from './IdentityCore.jsx'
import MottoPanel from './MottoPanel.jsx'
import Portal from './Portal.jsx'
import ProjectArtifact from './ProjectArtifact.jsx'
import SectorGate from './SectorGate.jsx'
import StackCore from './StackCore.jsx'

/** Which structure stands for each kind of node. */
const STRUCTURES = {
  project: ProjectArtifact,
  experience: ExperienceStele,
  stack: StackCore,
  education: EducationPillar,
  motto: MottoPanel,
  contact: Portal,
  link: Portal,
}

/** Everything built in the world: one structure per node, and the sector gates. */
export default function Structures() {
  return (
    <>
      <IdentityCore />
      {NODES.filter((node) => STRUCTURES[node.kind]).map((node) => {
        const Structure = STRUCTURES[node.kind]
        return <Structure key={node.id} node={node} />
      })}
      {SECTORS.filter((sector) => sector.gate).map((sector) => (
        <SectorGate key={sector.id} sector={sector} />
      ))}
      <Floaters />
    </>
  )
}
