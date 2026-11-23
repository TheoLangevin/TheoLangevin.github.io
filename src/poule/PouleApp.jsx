import { useEffect } from 'react'
import { usePoule } from './state/usePoule.js'
import ActionButtons from './ui/controls/ActionButtons.jsx'
import BetControl from './ui/controls/BetControl.jsx'
import ModePicker from './ui/controls/ModePicker.jsx'
import { useKeyboard } from './ui/hooks/useKeyboard.js'
import Header from './ui/layout/Header.jsx'
import StorageNotice from './ui/layout/StorageNotice.jsx'
import FairnessPanel from './ui/panels/FairnessPanel.jsx'
import SafetyPanel from './ui/panels/SafetyPanel.jsx'
import StatsPanel from './ui/panels/StatsPanel.jsx'
import HistoryStrip from './ui/road/HistoryStrip.jsx'
import Road from './ui/road/Road.jsx'
import './ui/controls/controls.css'
import './ui/panels/panels.css'

/** Page layout: header, the arcade cabinet with the road, controls, then panels. */
export default function PouleApp() {
  const init = usePoule((state) => state.init)

  useEffect(() => {
    init()
  }, [init])
  useKeyboard()

  return (
    <div className="page">
      <Header />
      <StorageNotice />
      <div className="cabinet">
        <Road />
        <HistoryStrip />
      </div>
      <div className="controls">
        <BetControl />
        <ModePicker />
        <ActionButtons />
      </div>
      <div className="panels">
        <StatsPanel />
        <FairnessPanel />
        <SafetyPanel />
      </div>
    </div>
  )
}
