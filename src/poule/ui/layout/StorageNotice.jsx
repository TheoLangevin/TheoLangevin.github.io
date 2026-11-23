import { usePoule } from '../../state/usePoule.js'

/** Says so when the game cannot keep its database in this browser. */
export default function StorageNotice() {
  const message = usePoule((state) => state.storageError)
  if (!message) return null
  return (
    <p className="notice" role="alert">
      {message}
    </p>
  )
}
