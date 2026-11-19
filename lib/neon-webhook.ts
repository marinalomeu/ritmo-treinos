import 'server-only';
import crypto from 'node:crypto';

export async function verifyNeonWebhook(rawBody: string, headers: Headers) {
  const signature=headers.get('x-neon-signature');
  const kid=headers.get('x-neon-signature-kid');
  const stamp=headers.get('x-neon-timestamp');
  if(!signature||!kid||!stamp||!/^\d{13}$/.test(stamp))throw new Error('Cabeçalhos do webhook inválidos.');
  const sentAt=Number(stamp);
  if(!Number.isSafeInteger(sentAt)||Math.abs(Date.now()-sentAt)>5*60*1000)throw new Error('Webhook expirado.');
  const baseUrl=process.env.NEON_AUTH_BASE_URL;
  if(!baseUrl)throw new Error('Configuração do Neon Auth ausente.');
  const response=await fetch(`${baseUrl}/.well-known/jwks.json`,{cache:'no-store'});
  if(!response.ok)throw new Error('Não foi possível obter a chave de assinatura.');
  const jwks=await response.json() as {keys:Array<{kid?:string;kty?:string;crv?:string;alg?:string;[key:string]:unknown}>};
  const jwk=jwks.keys.find(k=>k.kid===kid&&k.kty==='OKP'&&k.crv==='Ed25519');
  if(!jwk)throw new Error('Chave de assinatura não reconhecida.');
  const parts=signature.split('.');
  if(parts.length!==3||parts[1]!==''||!parts[0]||!parts[2])throw new Error('Assinatura JWS inválida.');
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8')) as {alg?:string;kid?:string};
  if(header.alg!=='EdDSA'||(header.kid&&header.kid!==kid))throw new Error('Algoritmo ou chave inválida.');
  const signedPayload=`${stamp}.${Buffer.from(rawBody,'utf8').toString('base64url')}`;
  const signedInput=`${parts[0]}.${Buffer.from(signedPayload,'utf8').toString('base64url')}`;
  const valid=crypto.verify(null,Buffer.from(signedInput),crypto.createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url'));
  if(!valid)throw new Error('Assinatura não verificada.');
  return JSON.parse(rawBody) as {event_id?:string;event_type?:string;user?:{id?:string;email?:string}};
}
