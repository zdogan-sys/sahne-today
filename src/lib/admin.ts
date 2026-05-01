export const ADMIN_EMAIL = 'z_dogan@hotmail.com'

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return user?.email === ADMIN_EMAIL
}
