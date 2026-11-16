export const ROLES = {
  AUTHOR: 'AUTHOR',
  EDITOR: 'EDITOR',
  STAFF: 'STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN',
}

// Where each role lands after sign-in. The actual role (from /auth/me) is the access rule;
// the backend's `redirect_hint` is ignored.
// NOTE: AUTHOR and EDITOR point to '/' until their workspaces are built (author dashboard in
// phase 3, editor workspace in phase 5); update here when those routes exist.
export function roleHome(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return '/admin/employees'
    case ROLES.STAFF:
      return '/admin/manuscripts'
    case ROLES.EDITOR:
      return '/'
    case ROLES.AUTHOR:
    default:
      return '/'
  }
}

export const isEmployee = (role) =>
  role === ROLES.STAFF || role === ROLES.EDITOR || role === ROLES.SUPER_ADMIN
