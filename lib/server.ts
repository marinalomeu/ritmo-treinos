import 'server-only';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'ritmo_session';
const COOKIE_AGE = 60 * 60 * 24 * 30;
export const isCloudConfigured = () => Boolean(process.env.DATABASE_URL && process.env.APP_PASSWORD && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
export const db = () => {
  if (!isCloudConfigured()) throw new Error('Conexão com Neon não configurada.');
  return neon(process.env.DATABASE_URL!);
};
const sign = (message: string) => createHmac('sha256', process.env.SESSION_SECRET || '').update(message).digest('base64url');
export const isValidPassword = (candidate: string): boolean => {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !isCloudConfigured()) return false;
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a,b);
};
export const hasSession = async (): Promise<boolean> => {
  if (!isCloudConfigured()) return false;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a,b);
};
export const setSessionCookie = (response: NextResponse) => {
  const expires = String(Date.now() + COOKIE_AGE * 1000);
  response.cookies.set(COOKIE_NAME, `${expires}.${sign(expires)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    maxAge: COOKIE_AGE, path: '/'
  });
};
export const clearSessionCookie = (response: NextResponse) => response.cookies.set(COOKIE_NAME, '', {httpOnly:true, maxAge:0, path:'/'});
export const unauthorized = () => NextResponse.json({error:'Sua sessão expirou. Entre novamente.'}, {status:401});
export const serverError = (error: unknown) => {
  console.error('[ritmo]', error);
  return NextResponse.json({error:'Não foi possível acessar o banco. Verifique a configuração e tente novamente.'}, {status:500});
};
export const sameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
};
export const forbiddenOrigin = () => NextResponse.json({error:'Origem não permitida.'}, {status:403});
