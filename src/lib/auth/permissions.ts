export type Role = 'admin' | 'editor'

export type Permission =
  | 'content:manage'
  | 'media:upload'
  | 'inquiries:read'
  | 'inquiries:manage'
  | 'inquiries:delete'
  | 'offers:manage'
  | 'users:manage'
  | 'settings:manage'
  | 'audit:read'

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set<Permission>([
    'content:manage',
    'media:upload',
    'inquiries:read',
    'inquiries:manage',
    'inquiries:delete',
    'offers:manage',
    'users:manage',
    'settings:manage',
    'audit:read',
  ]),
  // Editors maintain public content. They cannot see inquiries (personal data),
  // change discounts, manage users or site-wide settings.
  editor: new Set<Permission>(['content:manage', 'media:upload']),
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  editor: 'Editor',
}
