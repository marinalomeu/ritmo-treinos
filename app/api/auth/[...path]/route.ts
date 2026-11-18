import { NextRequest, NextResponse } from 'next/server';
import { authService, multiuserConfigured } from '../../../../lib/multiuser';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!multiuserConfigured()) return NextResponse.json({ error: 'Autenticação indisponível.' }, { status: 503 });
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
