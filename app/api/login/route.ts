import { NextResponse } from 'next/server';
// A antiga senha compartilhada nunca deve autenticar uma conta multiusuário.
export async function POST() {
  return NextResponse.json({error:'Utilize o login individual.'},{status:410});
}
