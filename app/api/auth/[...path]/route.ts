import { NextRequest, NextResponse } from 'next/server';
import { authService, multiuserConfigured } from '../../../../lib/multiuser';

async function proxy(request: NextRequest) {
  if (!multiuserConfigured()) return NextResponse.json({ error: 'Autenticação indisponível.' }, { status: 503 });
  const handlers = authService().handler();
  switch (request.method) {
    case 'GET': return handlers.GET(request);
    case 'POST': return handlers.POST(request);
    case 'PUT': return handlers.PUT(request);
    case 'DELETE': return handlers.DELETE(request);
    case 'PATCH': return handlers.PATCH(request);
    default: return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 });
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
