import Link from 'next/link';
import { Suspense } from 'react';

import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in — Conductor' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="mx-auto max-w-[1080px] px-8 py-5 flex items-baseline justify-between">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-serif text-[20px]">Conductor</span>
            <span className="label">Aberdeen Advisors</span>
          </Link>
        </div>
      </header>
      <div className="grow flex items-start justify-center px-6 py-16">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
