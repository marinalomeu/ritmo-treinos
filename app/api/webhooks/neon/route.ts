import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '../../../../lib/server';
import { multiuserConfigured } from '../../../../lib/multiuser';
import { verifyNeonWebhook } from '../../../../lib/neon-webhook';

// QA ONLY: log signed webhook receipt and allow/deny result in the isolated database.
// This diagnostic code MUST NOT be cherry-picked to the release branch.
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
      let allowed=false;
      if(email && email.length<=254){
        const rows=await sql`
          SELECT id FROM public.app_invitations
          WHERE email=${email} AND status='pending' AND expires_at>NOW()
          AND activated_at>NOW()-INTERVAL '30 minutes' LIMIT 1
        `;
        allowed=rows.length>0;
      }
      const digest=createHash('sha256').update(email).digest('hex');
      await sql`INSERT INTO public.auth_gate_qa_events(event_id,event_type,email_sha256,allowed)
        VALUES (${String(payload.event_id??'')},'user.before_create',${digest},${allowed})`;
      console.info('[ritmo QA] valid signed before_create event, allowed:',allowed);
      return NextResponse.json(allowed?{allowed:true}:
        {allowed:false,error_message:'Você precisa de um convite válido.',error_code:'INVITE_REQUIRED'});
    }
    if(payload.event_type==='user.created'){
      const digest=createHash('sha256').update(email).digest('hex');
      await sql`INSERT INTO public.auth_gate_qa_events(event_id,event_type,email_sha256,allowed)
        VALUES (${String(payload.event_id??'')},'user.created',${digest},NULL)`;
      console.info('[ritmo QA] signed user.created event received');
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
      return NextResponse.json({success:true});
    }
    return NextResponse.json({success:true});
  }catch(error){
    console.error('[ritmo] Falha na validação de webhook',error instanceof Error?error.message:'erro');
    return NextResponse.json({error:'Evento não aceito.'},{status:400});
  }
}
