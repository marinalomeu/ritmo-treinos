import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentProfile, multiuserConfigured } from '../../../../lib/multiuser';
import { db, sameOrigin, forbiddenOrigin, unauthorized, serverError } from '../../../../lib/server';
const normalize=(email:string)=>email.trim().toLowerCase();
const valid=(email:string)=>email.length<=254&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
async function admin(){
  const user=await currentProfile();
  return user?.role==='owner'?user:null;
}

export async function GET(){
  if(!multiuserConfigured())return NextResponse.json({error:'Não configurado.'},{status:503});
  const user=await admin();
  if(!user)return unauthorized();
  try{
    const sql=db();
    const rows=await sql`
      SELECT id::text AS id,email,status,created_at::text AS created_at,
        expires_at::text AS expires_at,accepted_at::text AS accepted_at
      FROM public.app_invitations WHERE invited_by=${user.id}::uuid
      ORDER BY created_at DESC LIMIT 100
    `;
    return NextResponse.json({invitations:rows},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return serverError(error);}
}

export async function POST(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Não configurado.'},{status:503});
  const user=await admin();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const body=await request.json();
    const email=normalize(typeof body.email==='string'?body.email:'');
    if(!valid(email))return NextResponse.json({error:'E-mail inválido.'},{status:400});
    const sql=db();
    const exists=await sql`
      SELECT 1 FROM public.app_profiles WHERE email=${email} LIMIT 1
    `;
    if(exists.length)return NextResponse.json({error:'Este e-mail já possui uma conta.'},{status:409});
    const token=randomBytes(32).toString('hex');
    const hash=createHash('sha256').update(token).digest('hex');
    const rows=await sql`
      INSERT INTO public.app_invitations(email,token_hash,expires_at,invited_by)
      VALUES (${email},${hash},NOW()+INTERVAL '7 days',${user.id}::uuid)
      RETURNING id::text AS id,expires_at::text AS expires_at
    `;
    const origin=new URL(request.url).origin;
    return NextResponse.json({id:rows[0].id,email,expires_at:rows[0].expires_at,
      invite_url:`${origin}/convite/${token}`},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof Error && /unique|duplicate|23505/.test(error.message))
      return NextResponse.json({error:'Já existe um convite pendente para esse e-mail.'},{status:409});
    return serverError(error);
  }
}

export async function PATCH(request:Request){
  if(!multiuserConfigured())return NextResponse.json({error:'Não configurado.'},{status:503});
  const user=await admin();
  if(!user)return unauthorized();
  if(!sameOrigin(request))return forbiddenOrigin();
  try{
    const {id}=await request.json();
    if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'ID inválido.'},{status:400});
    const sql=db();
    const rows=await sql`
      UPDATE public.app_invitations SET status='revoked'
      WHERE id=${id}::uuid AND invited_by=${user.id}::uuid AND status='pending'
      RETURNING id
    `;
    return NextResponse.json({revoked:rows.length>0});
  }catch(error){return serverError(error);}
}
