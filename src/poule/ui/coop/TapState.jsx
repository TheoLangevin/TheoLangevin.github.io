/** Says when taps stop counting fully: too fast, or the hen is tired. */
export default function TapState({ share }) {
  if (share >= 1) return null
  return (
    <span className="coop-settle">
      {share <= 0 ? '⏸️ Trop rapide : ralentis un peu' : `😮‍💨 La poule fatigue : ${Math.round(share * 100)} % · fais une pause`}
    </span>
  )
}
