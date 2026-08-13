/**
 * Server helpers for pages. Keeps every page from repeating the session + engagement lookup.
 */

import { redirect } from 'next/navigation';

import { getSession } from './auth';
import { latestSnapshot } from './publish';
import { getDb } from './store';
import type { PublicUser, PublishedSnapshot } from './types';
import { buildEngagementView, primaryEngagementId } from './view';
import type { EngagementView } from './view';

/** Aberdeen pages: the live working model. Redirects rather than throwing. */
export async function requireWorkspace(): Promise<{ user: PublicUser; view: EngagementView }> {
  const session = await getSession();
  if (!session) redirect('/login?next=%2Fworkspace');
  if (session.role !== 'aberdeen') redirect('/portal');
  const engagementId = primaryEngagementId(session.user.engagementIds);
  if (!engagementId) redirect('/login');
  return { user: session.user, view: buildEngagementView(engagementId) };
}

/**
 * Portal pages: the latest published snapshot and nothing else. A client user never reaches
 * live working data through this path.
 */
export async function requirePortal(): Promise<{
  user: PublicUser;
  role: 'aberdeen' | 'client';
  engagementId: string;
  snapshot: PublishedSnapshot | null;
}> {
  const session = await getSession();
  if (!session) redirect('/login?next=%2Fportal');
  const engagementId = primaryEngagementId(session.user.engagementIds);
  if (!engagementId) redirect('/login');
  return {
    user: session.user,
    role: session.role,
    engagementId,
    snapshot: latestSnapshot(getDb(), engagementId),
  };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function titleCase(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
