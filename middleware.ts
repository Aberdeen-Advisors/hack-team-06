/**
 * Route protection. This runs in the Edge runtime, so it verifies the session cookie with Web
 * Crypto rather than node:crypto and never touches the store.
 *
 * Middleware only redirects. Authorisation is enforced again server-side in every API route and
 * server component via `requireRole` — see lib/auth.ts.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'conductor_session';

function secret(): string {
  return process.env.SESSION_SECRET ?? 'atlas-dev-secret';
}

function b64urlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verify(token: string | undefined): Promise<{ userId: string; role: string } | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const expected = new Uint8Array(mac);
    const actual = b64urlToBytes(signature);
    if (expected.length !== actual.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) diff |= expected[i] ^ actual[i];
    if (diff !== 0) return null;
    const json = new TextDecoder().decode(b64urlToBytes(body));
    const parsed = JSON.parse(json) as { userId?: unknown; role?: unknown };
    if (typeof parsed.userId !== 'string') return null;
    if (parsed.role !== 'aberdeen' && parsed.role !== 'client') return null;
    return { userId: parsed.userId, role: parsed.role };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const isWorkspace = pathname.startsWith('/workspace');
  const isPortal = pathname.startsWith('/portal');
  if (!isWorkspace && !isPortal) return NextResponse.next();

  const session = await verify(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  // A client user has no access to the working model.
  if (isWorkspace && session.role === 'client') {
    const portal = request.nextUrl.clone();
    portal.pathname = '/portal';
    portal.search = '';
    return NextResponse.redirect(portal);
  }

  // Aberdeen users may view the portal, but only as an explicit preview.
  if (isPortal && session.role === 'aberdeen' && searchParams.get('preview') !== '1') {
    const preview = request.nextUrl.clone();
    preview.searchParams.set('preview', '1');
    return NextResponse.redirect(preview);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/workspace/:path*', '/portal/:path*'],
};
