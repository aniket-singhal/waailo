'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const FEATURES = [
  { icon: '👥', title: 'Employee records', desc: 'A single source of truth for people, departments, designations and org structure.' },
  { icon: '🕐', title: 'Attendance', desc: 'Check-in/out, regularisation and monthly summaries that feed payroll.' },
  { icon: '🏖️', title: 'Leave management', desc: 'Configurable policies, balances and a clean apply → approve workflow.' },
  { icon: '💸', title: 'Payroll', desc: 'Runs, statutory deductions (EPF/ESI/PT/TDS) and downloadable payslips.' },
  { icon: '🧑‍💼', title: 'Recruitment', desc: 'Job openings, an applicant pipeline and one-click hire to onboarding.' },
  { icon: '🎯', title: 'Performance', desc: 'Goals with progress tracking and structured review cycles.' },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading || user) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Waailo HR" className="h-8 w-auto" />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#modules" className="hover:text-slate-900">Modules</a>
            <a href="#why" className="hover:text-slate-900">Why Waailo</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-brand-700">
              Sign in
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-white" />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            Smart HRMS for Growing Businesses
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Run all of HR in one calm, simple place.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Waailo HR brings employee records, attendance, leave, payroll, recruitment and
            performance together — built for small and mid-sized teams.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login?mode=signup"
              className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Create your company — free
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-400">No credit card needed · Set up in minutes</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">Everything your HR team needs</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
          One system, no spreadsheets, no juggling tools.
        </p>
        <div id="modules" className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 p-6 transition-shadow hover:shadow-md">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why band */}
      <section id="why" className="bg-brand-900 py-16 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3">
          {[
            { n: '6+', l: 'integrated HR modules' },
            { n: '15 min', l: 'to run monthly payroll' },
            { n: '100%', l: 'multi-tenant & secure' },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-4xl font-extrabold">{s.n}</p>
              <p className="mt-1 text-sm text-brand-100">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900">Ready to simplify HR?</h2>
        <p className="mt-3 text-slate-600">Create your company and invite your team today.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Waailo HR" className="h-7 w-auto" />
          <p>© {new Date().getFullYear()} Waailo HR — Smart HRMS for Growing Businesses.</p>
        </div>
      </footer>
    </div>
  );
}
