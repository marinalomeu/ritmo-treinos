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
      SELECT p.id::text AS id,p.email,p.role FROM public.app_profiles p
      JOIN neon_auth."user" u ON u.id=p.id AND u."emailVerified"=true
      WHERE p.id=${id}::uuid AND p.enabled=true LIMIT 1
    `;
    if (profiles.length) return profiles[0] as Profile;
    // Recupera convites cuja notificação não bloqueante user.created não chegou.
    // Exige sessão real, e-mail confirmado no Neon e convite ativado.
    const email = String(data?.user?.email ?? '').trim().toLowerCase();
    if (!email || email.length > 254) return null;
    const claimed = await sql`
      WITH valid_user AS (
        SELECT id,email FROM neon_auth."user" WHERE id=${id}::uuid
          AND lower(email)=${email} AND "emailVerified"=true
      ), invitation AS (
        UPDATE public.app_invitations i
        SET status='accepted',accepted_at=NOW()
        FROM valid_user u
        WHERE i.email=lower(u.email) AND i.status='pending'
          AND i.expires_at>NOW() AND i.activated_at>NOW()-INTERVAL '30 minutes'
        RETURNING i.email
      ), linked AS (
        INSERT INTO public.app_profiles(id,email,role,enabled)
        SELECT ${id}::uuid,email,'member',true FROM invitation
        ON CONFLICT(id) DO NOTHING RETURNING id,email,role
      )
      SELECT id::text,email,role FROM linked LIMIT 1
    `;
    return claimed.length ? claimed[0] as Profile : null;
  } catch (error) {
    console.error('[ritmo] Sessão não validada', error);
    return null;
  }
}

export const hasOwnerRole = (profile: Profile | null): profile is Profile =>
  Boolean(profile?.role === 'owner');
