import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { db, sameOrigin, forbiddenOrigin } from '../../../../lib/server';
import { multiuserConfigured } from '../../../../lib/multiuser';
export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Não configurado.'},{status:503});
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const body=await request.json();
    const token=typeof body.token==='string'?body.token:'';
    if(!/^[0-9a-f]{64}$/.test(token))return NextResponse.json({error:'Convite inválido.'},{status:404});
    const hash=createHash('sha256').update(token).digest('hex');
    const sql=db();
    const rows=await sql`
      UPDATE public.app_invitations
      SET activated_at=COALESCE(activated_at,NOW())
      WHERE token_hash=${hash} AND status='pending' AND expires_at>NOW()
        AND (activated_at IS NULL OR activated_at>NOW()-INTERVAL '30 minutes')
      RETURNING email,expires_at::text AS expires_at
    `;
    if(!rows.length)return NextResponse.json({error:'Convite expirado, revogado ou já utilizado.'},{status:404});
    return NextResponse.json({email:rows[0].email,expires_at:rows[0].expires_at},
      {headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'Convite inválido.'},{status:400});}
}
