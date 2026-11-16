export const ROLES = {
  AUTHOR: 'AUTHOR',
  EDITOR: 'EDITOR',
  STAFF: 'STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN',
}

// Where each role lands after sign-in. The actual role (from /auth/me) is the access rule:
// AUTHOR -> their submissions (/dashboard)
// EDITOR -> assigned reviews (/editor)
// STAFF  -> screening/production (/admin/manuscripts)
// SUPER_ADMIN -> administrative tools (/admin)
export function roleHome(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return '/admin'
    case ROLES.STAFF:
      return '/admin/manuscripts'
    case ROLES.EDITOR:
      return '/editor'
    case ROLES.AUTHOR:
    default:
      return '/dashboard'
  }
}

export const isEmployee = (role) =>
  role === ROLES.STAFF || role === ROLES.EDITOR || role === ROLES.SUPER_ADMIN
