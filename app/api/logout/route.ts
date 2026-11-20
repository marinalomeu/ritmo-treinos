import { NextResponse } from 'next/server';
import { authService, multiuserConfigured } from '../../../lib/multiuser';
import { sameOrigin } from '../../../lib/server';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error:'Origem não permitida.' },{status:403});
  if (!multiuserConfigured()) return NextResponse.json({ error:'Autenticação indisponível.' },{status:503});
  try {
    await authService().signOut();
    return NextResponse.json({ok:true});
  } catch {
    return NextResponse.json({error:'Não foi possível encerrar a sessão.'},{status:500});
  }
}
