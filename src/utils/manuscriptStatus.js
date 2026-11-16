// Manuscript status labels and workflow rules from the backend handoff contract (Section 4.5).

export const MANUSCRIPT_STATUS = {
  SUBMITTED: 'SUBMITTED',
  CORRECTIONS_REQUESTED: 'CORRECTIONS_REQUESTED',
  ASSIGNED_TO_EDITOR: 'ASSIGNED_TO_EDITOR',
  REVISIONS_REQUESTED: 'REVISIONS_REQUESTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  PUBLISHED: 'PUBLISHED',
}

export const STATUS_META = {
  SUBMITTED: {
    label: 'Awaiting screening',
    nextAction: 'Staff claims or screens',
    tone: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  CORRECTIONS_REQUESTED: {
    label: 'Screening corrections requested',
    nextAction: 'Author uploads revised source',
    tone: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ASSIGNED_TO_EDITOR: {
    label: 'With editor',
    nextAction: 'Assigned editor reviews and decides',
    tone: 'indigo',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  REVISIONS_REQUESTED: {
    label: 'Editor revisions requested',
    nextAction: 'Author uploads revised source',
    tone: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ACCEPTED: {
    label: 'Accepted, in production',
    nextAction: 'Production staff and author work through proof tasks',
    tone: 'green',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
  },
  REJECTED: {
    label: 'Rejected',
    nextAction: 'Read the decision and history',
    tone: 'red',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
  PUBLISHED: {
    label: 'Published',
    nextAction: 'Open the public article',
    tone: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

export function getStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status || 'Unknown',
      nextAction: '',
      tone: 'gray',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    }
  )
}

export function canAuthorUploadRevision(status) {
  return status === MANUSCRIPT_STATUS.CORRECTIONS_REQUESTED || status === MANUSCRIPT_STATUS.REVISIONS_REQUESTED
}

export function formatIsoDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
