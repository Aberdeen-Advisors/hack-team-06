/**
 * Conductor — cookie session auth, no library.
 *
 * DEMO AUTHENTICATION. Passwords are stored in plaintext in the seed and compared directly.
 * There is no registration, no password reset and no rate limiting. The session cookie is a
 * signed (HMAC-SHA256) payload, not an encrypted one, so it is tamper-evident but readable.
 * This is stated in the README and must not be reused for anything real.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

import { getDb } from './store';
import type { PublicUser, Role, SessionPayload, User } from './types';

export const SESSION_COOKIE = 'conductor_session';
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): string {
  return process.env.SESSION_SECRET ?? 'atlas-dev-secret';
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

export function encodeSession(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verify signature and shape. Returns null for anything that does not verify. */
export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(body);
  if (signature.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof parsed?.userId !== 'string') return null;
    if (parsed.role !== 'aberdeen' && parsed.role !== 'client') return null;
    return { userId: parsed.userId, role: parsed.role };
  } catch {
    return null;
  }
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    title: user.title,
    engagementIds: [...user.engagementIds],
  };
}

/** Plaintext credential check against the seeded users — demo only. */
export function verifyCredentials(email: string, password: string): User | null {
  const normalized = email.trim().toLowerCase();
  const user = getDb().users.find((u) => u.email.toLowerCase() === normalized);
  if (!user || user.password !== password) return null;
  return user;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
};

/** Read the session in a server component or route handler. */
export async function getSession(): Promise<{ user: PublicUser; role: Role } | null> {
  const jar = await cookies();
  const payload = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = getDb().users.find((u) => u.id === payload.userId);
  if (!user) return null;
  // The cookie carries a role, but the seeded record is authoritative.
  return { user: toPublicUser(user), role: user.role };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Server-side role gate for route handlers. Every API route calls this — middleware is a
 * convenience for redirects, not the enforcement point.
 */
export async function requireRole(role: Role): Promise<PublicUser> {
  const session = await getSession();
  if (!session) throw new AuthError('Not signed in', 401);
  if (session.role !== role) throw new AuthError(`Requires ${role} role`, 403);
  return session.user;
}

export async function requireUser(): Promise<PublicUser> {
  const session = await getSession();
  if (!session) throw new AuthError('Not signed in', 401);
  return session.user;
}

/** Both roles may read, but the caller must still be signed in and on the engagement. */
export async function requireEngagementAccess(engagementId: string): Promise<PublicUser> {
  const user = await requireUser();
  if (!user.engagementIds.includes(engagementId)) {
    throw new AuthError('No access to this engagement', 403);
  }
  return user;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
