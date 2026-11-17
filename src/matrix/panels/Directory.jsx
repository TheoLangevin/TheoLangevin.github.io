import { NODES } from '../content/world.js'
import { useMatrix } from '../state/useMatrix.js'
import DirectoryList from './DirectoryList.jsx'
import HoloPanel from './HoloPanel.jsx'

/** The index of the world, with fast travel to every node. */
export default function Directory() {
  const closeOverlay = useMatrix((state) => state.closeOverlay)

  return (
    <HoloPanel
      path="// SYSTEM / INDEX"
      code={`${NODES.length} NODES INDEXED · ARROWS TO BROWSE · ENTER TO TRAVEL`}
      title="Directory"
      closeCodes={['Escape']}
      onClose={closeOverlay}
      wide
    >
      <DirectoryList action="TRAVEL" />
    </HoloPanel>
  )
}
