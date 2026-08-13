import Link from 'next/link';

import { DEMO_USERS } from '@/lib/demo-users';

export default function LandingPage() {
  const aberdeen = DEMO_USERS.filter((u) => u.role === 'aberdeen');
  const client = DEMO_USERS.filter((u) => u.role === 'client');

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="mx-auto max-w-[1080px] px-8 py-5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[20px]">Conductor</span>
            <span className="label">Aberdeen Advisors</span>
          </div>
          <Link href="/login" className="label hover:text-[var(--color-ink)]">
            Sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1080px] px-8 py-16">
        <p className="label mb-4">Transformation roadmap platform</p>
        <h1 className="text-[40px] leading-[1.1] max-w-[26ch]">
          One place for the whole engagement, from fact base to board narrative.
        </h1>
        <div className="mt-6 max-w-[76ch] text-[15.5px] text-[var(--color-ink-soft)] space-y-3">
          <p>
            Conductor carries an Aberdeen transformation engagement through the firm&rsquo;s
            methodology in a single working model: evidence, maturity assessment, a scored
            opportunity register, sequenced waves, and the decisions taken along the way.
          </p>
          <p>
            Every derived number — the weighted score, the priority band, the 2x2 quadrant, the
            feasibility of a wave — is owned by one calculation engine rather than typed into a
            spreadsheet cell, so the roadmap and the deck can never disagree.
          </p>
          <p>
            When the team is ready, they publish a version to the client portal, and what the
            client comments on, ranks or challenges comes back into the same model for review.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 mt-12">
          <SignInCard
            eyebrow="For the engagement team"
            title="Aberdeen workspace"
            description="The working model: fact base, maturity, register, sequencing, AI review, publication and the client feedback queue."
            href="/login?next=%2Fworkspace"
            credentials={aberdeen}
          />
          <SignInCard
            eyebrow="For the client"
            title="Client portal"
            description="Reads only what has been published. Comment on an initiative, rank the opportunities that matter most, or challenge the timing."
            href="/login?next=%2Fportal"
            credentials={client}
          />
        </div>

        <p className="text-[13px] text-[var(--color-slate)] mt-10 max-w-[80ch]">
          Demo build. Northwind Distribution is a fictional mid-market wholesale distributor and
          every figure below is invented. Credentials are shown on screen on purpose; passwords are
          seeded in plaintext and there is no shared database behind this.
        </p>
      </div>
    </main>
  );
}

function SignInCard({
  eyebrow,
  title,
  description,
  href,
  credentials,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  credentials: { email: string; password: string; name: string; title: string }[];
}) {
  return (
    <section
      className="bg-white border border-[var(--color-line)] rounded-[4px] p-6 flex flex-col"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <p className="label">{eyebrow}</p>
      <h2 className="text-[22px] mt-1.5">{title}</h2>
      <p className="text-[14px] text-[var(--color-slate)] mt-2 grow">{description}</p>

      <div className="mt-5 border-t border-[var(--color-line)] pt-4">
        <p className="label mb-2.5">Demo credentials</p>
        <ul className="space-y-2.5">
          {credentials.map((credential) => (
            <li key={credential.email} className="text-[13.5px]">
              <p className="font-medium">
                {credential.name}
                <span className="text-[var(--color-slate)] font-normal"> · {credential.title}</span>
              </p>
              <p className="tabular text-[var(--color-slate)]">
                {credential.email} / {credential.password}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={href}
        className="mt-5 inline-flex items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] text-white rounded-[3px] px-3.5 py-2 text-[14px] font-medium hover:bg-[var(--color-ink-soft)]"
      >
        Sign in to {title.toLowerCase()}
      </Link>
    </section>
  );
}
