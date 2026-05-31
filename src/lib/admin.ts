export const ADMIN_EMAIL = 'z_dogan@hotmail.com'

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return user?.email === ADMIN_EMAIL
}

// Moderatör kontrolü — DB'den senkron çalışmaz, action'larda kullanmak için ayrı helper
export async function isPrivilegedUser(
  user: { id: string; email?: string | null } | null | undefined
): Promise<boolean> {
  if (!user) return false
  if (user.email === ADMIN_EMAIL) return true
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('is_moderator')
    .eq('id', user.id)
    .single()
  return !!(data as any)?.is_moderator
}
