import { NextRequest, NextResponse } from 'next/server';
import { authService, multiuserConfigured } from '../../../../lib/multiuser';
import { db, sameOrigin, forbiddenOrigin } from '../../../../lib/server';

type AuthContext = { params: Promise<{ path: string[] }> };

// Defense-in-depth: the app refuses uninvited signups before proxying to
// Managed Better Auth, even if the provider webhook is degraded.
// The provider webhook remains essential for direct calls to the Neon Auth URL.
async function allowInvitedSignup(request: NextRequest): Promise<NextResponse | null> {
  if(!sameOrigin(request))return forbiddenOrigin();
  let email='';
  try {
    const input=await request.clone().json() as {email?:unknown};
    email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  }catch {
    return NextResponse.json({code:'INVALID_BODY',message:'Dados de cadastro inválidos.'},{status:400});
  }
  if(email.length<5||email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
    return NextResponse.json({code:'INVALID_EMAIL',message:'E-mail inválido.'},{status:400});
  }
  try{
    const sql=db();
    const rows=await sql`
      SELECT id FROM public.app_invitations
      WHERE email=${email} AND status='pending'
        AND expires_at>NOW() AND activated_at>NOW()-INTERVAL '30 minutes'
      LIMIT 1
    `;
    if(rows.length===0){
      return NextResponse.json({code:'INVITE_REQUIRED',message:'Você precisa de um convite válido para criar uma conta.'},
        {status:403,headers:{'Cache-Control':'no-store'}});
    }
    return null;
  }catch(error){
    console.error('[ritmo] Não foi possível validar um convite.');
    return NextResponse.json({code:'INVITE_VALIDATION_UNAVAILABLE',message:'Cadastro temporariamente indisponível.'},
      {status:503,headers:{'Cache-Control':'no-store'}});
  }
}

async function proxy(request: NextRequest, context: AuthContext) {
  if (!multiuserConfigured()) return NextResponse.json({ error: 'Autenticação indisponível.' }, { status: 503 });
  if(request.method==='POST'){
    const {path}=await context.params;
    if(path.join('/')==='sign-up/email'){
      const rejected=await allowInvitedSignup(request);
      if(rejected)return rejected;
    }
  }
  const handlers = authService().handler();
  switch (request.method) {
    case 'GET': return handlers.GET(request, context);
    case 'POST': return handlers.POST(request, context);
    case 'PUT': return handlers.PUT(request, context);
    case 'DELETE': return handlers.DELETE(request, context);
    case 'PATCH': return handlers.PATCH(request, context);
    default: return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 });
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
