'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button, Field, Input } from '@/components/ui';
import { DEMO_USERS } from '@/lib/demo-users';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(withEmail: string, withPassword: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: withEmail, password: withPassword }),
      });
      const data = (await response.json()) as { user?: { role: string }; error?: string };
      if (!response.ok || !data.user) {
        setError(data.error ?? 'Sign in failed');
        setBusy(false);
        return;
      }
      const destination =
        next && next.startsWith('/')
          ? next
          : data.user.role === 'aberdeen'
            ? '/workspace'
            : '/portal';
      router.push(destination);
      router.refresh();
    } catch {
      setError('Could not reach the server');
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[880px] grid gap-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <section
        className="bg-white border border-[var(--color-line)] rounded-[4px] p-6"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <p className="label">Conductor</p>
        <h1 className="text-[24px] mt-1.5 mb-5">Sign in</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signIn(email, password);
          }}
          className="space-y-4"
        >
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@aberdeenadvisors.com"
              required
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          {error ? (
            <p className="text-[13px] text-[var(--color-critical-ink)]">{error}</p>
          ) : null}
          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </section>

      <section
        className="bg-white border border-[var(--color-line)] rounded-[4px] p-6"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <p className="label">Demo users</p>
        <h2 className="text-[18px] mt-1.5">Sign in as anyone on the engagement</h2>
        <p className="text-[13.5px] text-[var(--color-slate)] mt-1.5 mb-4">
          This is a demo build with seeded users and plaintext passwords. Pick a role to fill the
          form and sign straight in.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {DEMO_USERS.map((user) => (
            <button
              key={user.email}
              type="button"
              disabled={busy}
              onClick={() => {
                setEmail(user.email);
                setPassword(user.password);
                void signIn(user.email, user.password);
              }}
              className="text-left border border-[var(--color-line-strong)] rounded-[3px] px-3 py-2.5 hover:bg-[var(--color-canvas)] disabled:opacity-50"
            >
              <p className="label">
                {user.role === 'aberdeen' ? 'Aberdeen' : 'Client'}
              </p>
              <p className="text-[14px] font-medium mt-0.5">{user.name}</p>
              <p className="text-[12.5px] text-[var(--color-slate)]">{user.title}</p>
              <p className="text-[12px] text-[var(--color-slate-light)] tabular mt-1">
                {user.email}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
