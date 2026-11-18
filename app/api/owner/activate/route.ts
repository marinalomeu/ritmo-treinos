import {NextResponse} from 'next/server';
import {authService,multiuserConfigured} from '../../../../lib/multiuser';
import {db,sameOrigin,forbiddenOrigin} from '../../../../lib/server';
export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Ambiente não configurado.'},{status:503});
  if(!sameOrigin(request))return forbiddenOrigin();
  const {data,error}=await authService().getSession();
  if(error||!data?.user?.id)return NextResponse.json({error:'Login necessário.'},{status:401});
  const id=String(data.user.id);
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Conta não autorizada.'},{status:403});
  try{
    const sql=db();
    const result=await sql`
      UPDATE public.app_profiles p
      SET enabled=true
      FROM neon_auth."user" u
      WHERE p.id=${id}::uuid AND u.id=p.id AND p.role='owner'
        AND p.enabled=false AND u."emailVerified"=true
        AND EXISTS (
          SELECT 1 FROM neon_auth.account a WHERE a."userId"=u.id
            AND a."providerId"='credential' AND a.password IS NOT NULL
        )
      RETURNING p.id
    `;
    if(result.length)return NextResponse.json({ok:true});
    const existing=await sql`
      SELECT p.enabled FROM public.app_profiles p
      JOIN neon_auth."user" u ON u.id=p.id
      WHERE p.id=${id}::uuid AND p.role='owner' AND u."emailVerified"=true
        AND EXISTS (SELECT 1 FROM neon_auth.account a WHERE a."userId"=u.id
          AND a."providerId"='credential' AND a.password IS NOT NULL)
      LIMIT 1
    `;
    if(existing.length&&existing[0].enabled)return NextResponse.json({ok:true});
    return NextResponse.json({error:'Conta ainda não verificada ou sem permissão de administradora.'},{status:403});
  }catch(error){
    console.error('[ritmo] Falha ao ativar conta',error instanceof Error?error.message:'erro');
    return NextResponse.json({error:'Não foi possível ativar a conta.'},{status:500});
  }
}
