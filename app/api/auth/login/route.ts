import { NextResponse } from 'next/server';

import { readJson } from '@/lib/api';
import { encodeSession, sessionCookieOptions, SESSION_COOKIE, toPublicUser, verifyCredentials } from '@/lib/auth';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  const user = verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Email or password is incorrect' }, { status: 401 });
  }

  const response = NextResponse.json({ user: toPublicUser(user) });
  response.cookies.set(
    SESSION_COOKIE,
    encodeSession({ userId: user.id, role: user.role }),
    sessionCookieOptions,
  );
  return response;
}
