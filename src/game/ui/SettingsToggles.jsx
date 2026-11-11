import { useGame } from '../state/useGame.js'

const SETTINGS = [
  { key: 'sound', label: 'Sound' },
  { key: 'glow', label: 'Glow effects' },
]

export default function SettingsToggles() {
  const settings = useGame((state) => state.settings)
  const toggleSetting = useGame((state) => state.toggleSetting)

  return (
    <div className="toggles">
      {SETTINGS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className="toggle"
          aria-pressed={settings[key]}
          onClick={() => toggleSetting(key)}
        >
          {label}: {settings[key] ? 'on' : 'off'}
        </button>
      ))}
    </div>
  )
}
