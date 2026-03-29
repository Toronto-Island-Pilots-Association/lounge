import type { UserRole } from '@/types/database'

export function isPlatformAdminRole(role: UserRole | string | null | undefined): boolean {
  return role === 'admin'
}

export function isOrgManagerRole(role: UserRole | string | null | undefined): boolean {
  return role === 'admin' || role === 'editor'
}

export function getOrgRoleLabel(role: UserRole | string | null | undefined): string {
  if (role === 'admin') return 'Admin'
  if (role === 'editor') return 'Editor'
  return 'Member'
}

export function getOrgRoleBadgeClass(role: UserRole | string | null | undefined): string {
  if (role === 'admin') return 'bg-purple-100 text-purple-800'
  if (role === 'editor') return 'bg-sky-100 text-sky-800'
  return 'bg-gray-100 text-gray-800'
}
