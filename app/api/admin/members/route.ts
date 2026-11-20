import { NextResponse } from 'next/server';
import { currentProfile, multiuserConfigured } from '../../../../lib/multiuser';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../lib/server';

export const dynamic = 'force-dynamic';

async function owner() {
  const user = await currentProfile();
  return user?.role === 'owner' ? user : null;
}

export async function GET() {
  if (!multiuserConfigured()) return NextResponse.json({error: 'Não configurado.'}, {status: 503});
  const user = await owner();
  if (!user) return unauthorized();
  try {
    const sql = db();
    const rows = await sql`
      SELECT p.id::text AS id, p.email, p.enabled, p.created_at::text AS created_at,
        u."emailVerified" AS email_verified
      FROM public.app_profiles p
      JOIN neon_auth."user" u ON u.id = p.id
      WHERE p.role = 'member' AND u."emailVerified" = true AND lower(u.email) = p.email
      ORDER BY p.created_at DESC LIMIT 200
    `;
    return NextResponse.json({members: rows}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return serverError(error); }
}

export async function PATCH(request: Request) {
  if (!multiuserConfigured()) return NextResponse.json({error: 'Não configurado.'}, {status: 503});
  const user = await owner();
  if (!user) return unauthorized();
  if (!sameOrigin(request)) return forbiddenOrigin();
  try {
    const body = await request.json() as {id?: unknown, enabled?: unknown};
    const id = body.id;
    const enabled = body.enabled;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      || typeof enabled !== 'boolean') {
      return NextResponse.json({error: 'Dados inválidos.'}, {status: 400});
    }
    if (id === user.id) return NextResponse.json({error: 'Não é permitido alterar a proprietária.'}, {status: 403});
    const sql = db();
    const rows = await sql`
      UPDATE public.app_profiles p
      SET enabled = ${enabled}
      FROM neon_auth."user" u
      WHERE p.id = ${id}::uuid AND p.role = 'member' AND u.id = p.id
        AND lower(u.email) = p.email AND u."emailVerified" = true
      RETURNING p.id::text AS id, p.email, p.enabled
    `;
    if (!rows.length) return NextResponse.json({error: 'Usuário não encontrado ou não verificado.'}, {status: 404});
    return NextResponse.json(rows[0], {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return serverError(error); }
}
