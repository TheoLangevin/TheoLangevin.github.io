import { useEffect } from 'react'
import { TIMING } from '../../config/timing.js'
import { usePoule } from '../../state/usePoule.js'

function Notice({ notice, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notice.id), notice.kind === 'break' ? TIMING.notice * 2 : TIMING.notice)
    return () => clearTimeout(timer)
  }, [notice, onDismiss])

  return (
    <button type="button" className={`notice-card notice-card--${notice.kind}`} onClick={() => onDismiss(notice.id)}>
      <b>{notice.title}</b>
      <span>{notice.detail}</span>
    </button>
  )
}

/** Achievements, level ups, purchases and break reminders, stacked at the top. */
export default function Notices() {
  const notices = usePoule((state) => state.notices)
  const dismiss = usePoule((state) => state.dismissNotice)
  return (
    <div className="notices" role="status" aria-live="polite">
      {notices.map((notice) => (
        <Notice key={notice.id} notice={notice} onDismiss={dismiss} />
      ))}
    </div>
  )
}
