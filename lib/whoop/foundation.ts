/**
 * WHOOP foundation: intentionally dormant until the owner provisions a WHOOP
 * developer app and approves enabling the connection in staging.
 * No WHOOP HTTP requests, OAuth callback or account linkage are exposed here.
 * https://developer.whoop.com/docs/developing/oauth/
 */
import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const WHOOP_AUTHORIZATION_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
export const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
export const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2';

export const WHOOP_READ_SCOPES = [
  'read:workout', 'read:recovery', 'read:sleep', 'read:cycles', 'offline'
] as const;

export type WhoopConnectionState = 'not_configured' | 'available' | 'connected' | 'reauthorization_required';

export function whoopEnabled(): boolean {
  // Strict opt-in; unset, empty, false, or unexpected value fails closed.
  return process.env.WHOOP_ENABLED === 'true';
}

export function whoopReady(): boolean {
  return whoopEnabled()
    && Boolean(process.env.WHOOP_CLIENT_ID)
    && Boolean(process.env.WHOOP_CLIENT_SECRET)
    && Boolean(process.env.WHOOP_REDIRECT_URI)
    && Boolean(process.env.WHOOP_TOKEN_ENCRYPTION_KEY);
}

/** WHOOP's OAuth reference currently documents an eight-character state. */
export function createWhoopOAuthState(): string {
  return randomBytes(6).toString('base64url'); // exactly 8 chars
}

/**
 * Configuration-only URL builder. Must never be called until a real, server-side
 * OAuth start route handles logged-in user ownership and stores a one-time,
 * expiring state hash. No start/callback route is shipped in this foundation.
 */
export function makeWhoopAuthorizationUrl(state: string): string {
  if (!whoopReady()) throw new Error('Integração WHOOP indisponível.');
  if (!/^[A-Za-z0-9_-]{8}$/.test(state)) throw new Error('Estado OAuth inválido.');
  const redirectUri = process.env.WHOOP_REDIRECT_URI!;
  const parsed = new URL(redirectUri);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
    throw new Error('Redirect URI WHOOP inválida.');
  }
  const url = new URL(WHOOP_AUTHORIZATION_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.WHOOP_CLIENT_ID!);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', WHOOP_READ_SCOPES.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

/** AES-256-GCM with independently randomized nonce for each token. */
function encryptionKey(): Buffer {
  const source = process.env.WHOOP_TOKEN_ENCRYPTION_KEY || '';
  // Canonical base64 of exactly 32 bytes; reject malformed/truncated secrets.
  const key = Buffer.from(source, 'base64');
  if (key.length !== 32 || key.toString('base64') !== source) {
    throw new Error('Chave de criptografia WHOOP não configurada.');
  }
  return key;
}

export function encryptWhoopToken(plaintext: string): string {
  if (!whoopEnabled()) throw new Error('Integração WHOOP indisponível.');
  if (!plaintext) throw new Error('Token vazio.');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptWhoopToken(encoded: string): string {
  if (!whoopEnabled()) throw new Error('Integração WHOOP indisponível.');
  const parts = encoded.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Envelope de token WHOOP inválido.');
  const nonce = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  if (nonce.length !== 12 || tag.length !== 16) throw new Error('Envelope de token WHOOP inválido.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
}

/** External identifiers are strings, not app-user UUIDs; uniqueness is scoped to owner/provider. */
export type WhoopImportReference = Readonly<{
  ownerUserId: string;
  provider: 'whoop';
  externalId: string;
  kind: 'workout' | 'cycle' | 'recovery' | 'sleep';
  recordedAt: string;
}>;

export function validateWhoopImportReference(ref: WhoopImportReference): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref.ownerUserId)
    && ref.provider === 'whoop'
    && ref.externalId.length > 0
    && ref.externalId.length <= 150
    && ['workout', 'cycle', 'recovery', 'sleep'].includes(ref.kind)
    && Number.isFinite(Date.parse(ref.recordedAt));
}
