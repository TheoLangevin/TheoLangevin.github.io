/** The sync status in a few words. */
export function syncLabel(sync) {
  switch (sync?.state) {
    case 'syncing':
      return 'Synchronisation…'
    case 'pending':
      return 'Sera synchronisé après la partie'
    case 'synced':
      return `Synchronisé à ${new Date(sync.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    case 'error':
      return 'Synchronisation impossible pour le moment'
    default:
      return 'En attente'
  }
}
