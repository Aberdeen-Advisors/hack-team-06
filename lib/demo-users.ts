/**
 * The demo credentials, shown on screen deliberately. Kept in one place so the landing page and
 * the login quick-fill buttons cannot drift apart from the seed.
 */

export interface DemoCredential {
  email: string;
  password: string;
  name: string;
  title: string;
  role: 'aberdeen' | 'client';
}

export const DEMO_USERS: DemoCredential[] = [
  {
    email: 'liv@aberdeenadvisors.com',
    password: 'conductor2026',
    name: 'Liv DeSantis',
    title: 'Engagement Lead',
    role: 'aberdeen',
  },
  {
    email: 'ashmi@aberdeenadvisors.com',
    password: 'conductor2026',
    name: 'Ashmi Chandra',
    title: 'Analyst',
    role: 'aberdeen',
  },
  {
    email: 'cio@northwind-distribution.com',
    password: 'client2026',
    name: 'Dana Whitfield',
    title: 'Chief Information Officer',
    role: 'client',
  },
  {
    email: 'coo@northwind-distribution.com',
    password: 'client2026',
    name: 'Marcus Reed',
    title: 'Chief Operating Officer',
    role: 'client',
  },
];
