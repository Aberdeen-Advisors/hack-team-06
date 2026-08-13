/**
 * Route handler helpers. Every handler is wrapped so that an AuthError becomes a 401/403 and
 * a validation error becomes a 400, and so authorisation is checked server-side on every call
 * rather than relying on middleware.
 */

import { NextResponse } from 'next/server';

import { AuthError, getSession, isAuthError, requireEngagementAccess, requireRole } from './auth';
import type { PublicUser, Role } from './types';

export class BadRequestError extends Error {
  status = 400;
}

export function bad(message: string): never {
  throw new BadRequestError(message);
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data as unknown as Record<string, unknown>, { status });
}

export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return json(await fn());
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Aberdeen-only endpoints: the working model. */
export async function aberdeenOnly(engagementId?: string): Promise<PublicUser> {
  const user = await requireRole('aberdeen');
  if (engagementId && !user.engagementIds.includes(engagementId)) {
    throw new AuthError('No access to this engagement', 403);
  }
  return user;
}

/** Client-only endpoints: submissions. */
export async function clientOnly(engagementId?: string): Promise<PublicUser> {
  const user = await requireRole('client');
  if (engagementId && !user.engagementIds.includes(engagementId)) {
    throw new AuthError('No access to this engagement', 403);
  }
  return user;
}

/** Endpoints both roles may read — a client still only ever receives snapshot data. */
export async function anyRole(engagementId: string): Promise<{ user: PublicUser; role: Role }> {
  const user = await requireEngagementAccess(engagementId);
  const session = await getSession();
  if (!session) throw new AuthError('Not signed in', 401);
  return { user, role: session.role };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      bad('Request body must be a JSON object');
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    bad('Request body must be valid JSON');
  }
}

export function str(body: Record<string, unknown>, key: string, required = true): string | undefined {
  const value = body[key];
  if (value === undefined || value === null) {
    if (required) bad(`Missing "${key}"`);
    return undefined;
  }
  if (typeof value !== 'string') bad(`"${key}" must be a string`);
  return value as string;
}

export function anchor(body: Record<string, unknown>, key: string): 1 | 2 | 3 | 4 | 5 {
  const value = body[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    bad(`"${key}" must be an integer from 1 to 5`);
  }
  return value as 1 | 2 | 3 | 4 | 5;
}

export function oneOf<T extends string>(
  body: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  required = true,
): T | undefined {
  const value = body[key];
  if (value === undefined || value === null) {
    if (required) bad(`Missing "${key}"`);
    return undefined;
  }
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    bad(`"${key}" must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}
