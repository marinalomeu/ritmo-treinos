import { NextResponse } from 'next/server';
import { db } from '../../../../lib/server';
import { multiuserConfigured } from '../../../../lib/multiuser';
import { verifyNeonWebhook } from '../../../../lib/neon-webhook';

const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Não configurado.'},{status:503});
  try{
    const raw=await request.text();
    if(raw.length>16000)return NextResponse.json({error:'Evento muito grande.'},{status:413});
    const payload=await verifyNeonWebhook(raw,request.headers);
    const email=String(payload.user?.email||'').trim().toLowerCase();
    const sql=db();
    if(payload.event_type==='user.before_create'){
      if(!email||email.length>254)return NextResponse.json({allowed:false,error_message:'Convite necessário.',error_code:'INVITE_REQUIRED'});
      const rows=await sql`
        SELECT id FROM public.app_invitations
        WHERE email=${email} AND status='pending' AND expires_at>NOW()
        AND activated_at>NOW()-INTERVAL '30 minutes' LIMIT 1
      `;
      return NextResponse.json(rows.length ? {allowed:true}:
        {allowed:false,error_message:'Você precisa de um convite válido.',error_code:'INVITE_REQUIRED'});
    }
    if(payload.event_type==='user.created'){
      const id=String(payload.user?.id||'');
      if(!idPattern.test(id)||!email)return NextResponse.json({error:'Identidade inválida.'},{status:400});
      // Retira o convite da fila e cria a associação de perfil numa única operação.
      await sql`
        WITH claimed AS (
          UPDATE public.app_invitations
          SET status='accepted',accepted_at=NOW()
          WHERE email=${email} AND status='pending' AND expires_at>NOW()
            AND activated_at>NOW()-INTERVAL '30 minutes'
          RETURNING email
        )
        INSERT INTO public.app_profiles(id,email,role)
        SELECT ${id}::uuid,email,'member' FROM claimed
        ON CONFLICT(id) DO NOTHING
      `;
      // A FK accepted_by referencia app_profiles: preencher somente depois do INSERT.
      // Reexecuções do webhook são idempotentes e não transferem o aceite entre usuários.
      await sql`UPDATE public.app_invitations i
        SET accepted_by=${id}::uuid
        WHERE i.email=${email} AND i.status='accepted'
          AND i.accepted_by IS NULL
          AND EXISTS (SELECT 1 FROM public.app_profiles p
            WHERE p.id=${id}::uuid AND p.email=${email})`;
      return NextResponse.json({success:true});
    }
    return NextResponse.json({success:true});
  }catch(error){
    console.error('[ritmo] Falha na validação de webhook',error instanceof Error?error.message:'erro');
    return NextResponse.json({error:'Evento não aceito.'},{status:400});
  }
}
