import { NextResponse } from 'next/server';
import { isCloudConfigured, isValidPassword, sameOrigin, setSessionCookie } from '../../../lib/server';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({error:'Origem não permitida.'},{status:403});
  if (!isCloudConfigured()) return NextResponse.json({error:'Configuração do servidor incompleta.'},{status:503});
  try {
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length > 256 || !isValidPassword(password)) return NextResponse.json({error:'Senha incorreta.'},{status:401});
    const response = NextResponse.json({ok:true});
    setSessionCookie(response);
    return response;
  } catch { return NextResponse.json({error:'Requisição inválida.'},{status:400}); }
}
