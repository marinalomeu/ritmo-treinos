import 'server-only';
import { createNeonAuth } from '@neondatabase/auth/next/server';
import { db } from './server';

export const multiuserEnabled = () => process.env.MULTIUSER_ENABLED === 'true';
export const multiuserConfigured = () =>
  multiuserEnabled() && Boolean(
    process.env.DATABASE_URL &&
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.NEON_AUTH_COOKIE_SECRET.length >= 32
  );

export function authService() {
  if (!multiuserConfigured()) throw new Error('Autenticação multiusuário não configurada.');
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
}

export type Profile = { id: string; email: string; role: 'owner' | 'member' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function currentProfile(): Promise<Profile | null> {
  if (!multiuserConfigured()) return null;
  try {
    const { data } = await authService().getSession();
    const id = String(data?.user?.id ?? '');
    if (!UUID.test(id)) return null;
    const sql = db();
    const profiles = await sql`
      SELECT id::text AS id,email,role FROM public.app_profiles
      WHERE id=${id}::uuid AND enabled=true LIMIT 1
    `;
    return profiles.length ? profiles[0] as Profile : null;
  } catch (error) {
    console.error('[ritmo] Sessão não validada', error);
    return null;
  }
}

export const hasOwnerRole = (profile: Profile | null): profile is Profile =>
  Boolean(profile?.role === 'owner');
