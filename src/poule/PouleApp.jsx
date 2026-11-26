import { useEffect } from 'react'
import { useAccount } from './state/useAccount.js'
import { usePoule } from './state/usePoule.js'
import AccountDialogs from './ui/account/AccountDialogs.jsx'
import PlayerSheet from './ui/account/PlayerSheet.jsx'
import { ChallengeSheet } from './ui/duels/Duels.jsx'
import { useGameSounds } from './ui/audio/useGameSounds.js'
import ConeParty from './ui/events/ConeParty.jsx'
import SeasonIntro from './ui/events/SeasonIntro.jsx'
import UpdateBanner from './ui/layout/UpdateBanner.jsx'
import PatchNotes from './ui/layout/PatchNotes.jsx'
import MissionsSheet from './ui/missions/MissionsSheet.jsx'
import EventLayer from './ui/events/EventLayer.jsx'
import { useHaptics } from './ui/feedback/useHaptics.js'
import { useKeyboard } from './ui/hooks/useKeyboard.js'
import Notices from './ui/layout/Notices.jsx'
import StorageNotice from './ui/layout/StorageNotice.jsx'
import AdminScreen from './ui/screens/AdminScreen.jsx'
import CoopScreen from './ui/screens/CoopScreen.jsx'
import PlayScreen from './ui/screens/PlayScreen.jsx'
import ProfileScreen from './ui/screens/ProfileScreen.jsx'
import RankingScreen from './ui/screens/RankingScreen.jsx'
import ShopScreen from './ui/screens/ShopScreen.jsx'
import TabBar from './ui/shell/TabBar.jsx'
import TopBar from './ui/shell/TopBar.jsx'
import { useRoute } from './ui/shell/useRoute.js'
import './ui/shell/shell.css'

/**
 * The app: a top bar, one screen, a tab bar. The play screen stays mounted
 * (hidden) when another tab is open, so a round in progress keeps its road;
 * the other screens mount when opened.
 */
export default function PouleApp() {
  const init = usePoule((state) => state.init)
  const initAccount = useAccount((state) => state.init)
  const [route, go] = useRoute()

  useEffect(() => {
    init().then(initAccount)
  }, [init, initAccount])
  useKeyboard(route === 'jouer')
  useGameSounds()
  useHaptics()

  return (
    <div className="app">
      <TopBar go={go} />
      <div className="app__screens">
        <StorageNotice />
        <PlayScreen hidden={route !== 'jouer'} />
        {route === 'poulailler' && <CoopScreen />}
        {route === 'boutique' && <ShopScreen />}
        {route === 'classement' && <RankingScreen go={go} />}
        {route === 'profil' && <ProfileScreen go={go} />}
        {route === 'admin' && <AdminScreen go={go} />}
      </div>
      <TabBar route={route} go={go} />
      <Notices />
      <AccountDialogs />
      <PlayerSheet />
      <ChallengeSheet />
      <EventLayer />
      <ConeParty />
      <SeasonIntro />
      <PatchNotes />
      <MissionsSheet />
      <UpdateBanner />
    </div>
  )
}
