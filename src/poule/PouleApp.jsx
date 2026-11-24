import { useEffect } from 'react'
import { useAccount } from './state/useAccount.js'
import { usePoule } from './state/usePoule.js'
import AccountDialogs from './ui/account/AccountDialogs.jsx'
import LeaderboardPanel from './ui/account/LeaderboardPanel.jsx'
import { useGameSounds } from './ui/audio/useGameSounds.js'
import ActionButtons from './ui/controls/ActionButtons.jsx'
import BetControl from './ui/controls/BetControl.jsx'
import ModePicker from './ui/controls/ModePicker.jsx'
import { useKeyboard } from './ui/hooks/useKeyboard.js'
import Header from './ui/layout/Header.jsx'
import Notices from './ui/layout/Notices.jsx'
import StorageNotice from './ui/layout/StorageNotice.jsx'
import FairnessPanel from './ui/panels/FairnessPanel.jsx'
import SafetyPanel from './ui/panels/SafetyPanel.jsx'
import StatsPanel from './ui/panels/StatsPanel.jsx'
import HistoryStrip from './ui/road/HistoryStrip.jsx'
import Road from './ui/road/Road.jsx'
import AchievementsPanel from './ui/shop/AchievementsPanel.jsx'
import ShopPanel from './ui/shop/ShopPanel.jsx'
import './ui/controls/controls.css'
import './ui/panels/panels.css'

/** Page layout: header, the arcade cabinet with the road, controls, the hen house, then panels. */
export default function PouleApp() {
  const init = usePoule((state) => state.init)
  const initAccount = useAccount((state) => state.init)

  useEffect(() => {
    init().then(initAccount)
  }, [init, initAccount])
  useKeyboard()
  useGameSounds()

  return (
    <div className="page">
      <Header />
      <Notices />
      <AccountDialogs />
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
      <ShopPanel />
      <AchievementsPanel />
      <LeaderboardPanel />
      <div className="panels">
        <StatsPanel />
        <FairnessPanel />
        <SafetyPanel />
      </div>
    </div>
  )
}
