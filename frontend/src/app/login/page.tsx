'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ApiError } from '@/lib/api/types';

type Mode = 'login' | 'signup';

function LoginForm() {
  const { login, signup } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [companySlug, setCompanySlug] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(companySlug.trim(), email.trim(), password);
      } else {
        await signup(companyName.trim(), email.trim(), password);
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const ssoNotice = () => setError('Single sign-on is not configured yet.');

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* ---------------- Left: form ---------------- */}
      <div className="relative flex items-center justify-center bg-white px-6 py-12 dark:bg-[#0f1523]">
        <Link
          href="/"
          className="absolute left-6 top-6 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          ← Back to home
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" aria-label="Waailo HR home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-full.svg" alt="Waailo HR" className="h-12 w-auto" />
            </Link>
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              🇬🇧 English
            </span>
          </div>

          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <span>🔒</span> {mode === 'login' ? 'Login' : 'Create account'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login' ? 'Welcome back to Waailo' : 'Set up your company on Waailo'}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'login' ? (
              <Field label="Company slug" htmlFor="slug">
                <Input
                  id="slug"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                  placeholder="your-company"
                  required
                />
              </Field>
            ) : (
              <Field label="Company name" htmlFor="cname">
                <Input
                  id="cname"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Pvt Ltd"
                  required
                />
              </Field>
            )}

            <Field label="Email *" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@company.com"
                required
              />
            </Field>

            <Field label="Password *" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </Field>

            {mode === 'login' ? (
              <button
                type="button"
                className="text-sm font-medium text-brand-600 hover:underline"
                onClick={() => setError('Password reset is available via your HR admin in this build.')}
              >
                Don&apos;t remember your password?
              </button>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create company'}
            </Button>
          </form>

          {mode === 'login' ? (
            <>
              <div className="my-5 flex items-center gap-3 text-xs font-medium text-slate-400">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                or
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              <div className="space-y-2.5">
                {[
                  { k: 'Google', icon: 'G' },
                  { k: 'Microsoft', icon: '⊞' },
                  { k: 'Okta', icon: '◎' },
                ].map((p) => (
                  <button
                    key={p.k}
                    type="button"
                    onClick={ssoNotice}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <span className="text-base">{p.icon}</span> Sign in with {p.k}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <p className="mt-5 text-center text-sm">
            <button
              type="button"
              className="font-semibold text-brand-600 hover:underline"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
            >
              {mode === 'login' ? 'Create an account for my business' : 'Back to sign in'}
            </button>
          </p>
        </div>

        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-slate-400">
          Created with ♥ in India · <Link href="/" className="hover:underline">Contact support</Link>
        </p>
      </div>

      {/* ---------------- Right: marketing panel ---------------- */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-amber-50 to-rose-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900" />
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(40rem_30rem_at_75%_25%,rgba(255,255,255,0.7),transparent)] dark:opacity-0" />

        <ThemeToggle className="absolute right-6 top-6 z-20" />

        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          <h2 className="max-w-md text-4xl font-bold leading-tight text-slate-900 dark:text-white">
            Cloud HR for you and all your colleagues
          </h2>
          <p className="mt-4 max-w-sm text-slate-600 dark:text-slate-300">
            Attendance, leave, payroll, onboarding and performance — for your whole team, in one
            place.
          </p>

          {/* Illustration + floating bubbles */}
          <div className="relative mt-14 h-64 w-full max-w-lg">
            <Bubble className="left-0 top-4 bg-amber-300" label="🗓️" />
            <Bubble className="right-10 top-0 bg-rose-400" label="⭐" />
            <Bubble className="right-0 bottom-16 bg-brand-500" label="📊" />
            <Bubble className="left-16 bottom-0 bg-emerald-400" label="👥" />
            <Bubble className="left-40 top-24 bg-violet-400" label="⏱️" />

            <svg viewBox="0 0 400 240" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="70" y="60" width="260" height="150" rx="14" className="fill-white/80 dark:fill-slate-800/80" />
              <rect x="70" y="60" width="260" height="34" rx="14" className="fill-brand-600/90" />
              <circle cx="90" cy="77" r="5" className="fill-white" />
              <circle cx="106" cy="77" r="5" className="fill-white/70" />
              <rect x="88" y="112" width="90" height="10" rx="5" className="fill-brand-200" />
              <rect x="88" y="132" width="150" height="8" rx="4" className="fill-slate-200 dark:fill-slate-600" />
              <rect x="88" y="150" width="120" height="8" rx="4" className="fill-slate-200 dark:fill-slate-600" />
              <rect x="88" y="176" width="70" height="20" rx="6" className="fill-amber-300" />
              <rect x="240" y="112" width="70" height="84" rx="8" className="fill-brand-50 dark:fill-slate-700" />
              <rect x="252" y="168" width="10" height="20" rx="3" className="fill-brand-400" />
              <rect x="268" y="152" width="10" height="36" rx="3" className="fill-brand-500" />
              <rect x="284" y="132" width="10" height="56" rx="3" className="fill-brand-600" />
            </svg>
          </div>
        </div>

        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
          Smart HRMS for growing businesses
        </p>
      </div>
    </main>
  );
}

function Bubble({ className, label }: { className: string; label: string }) {
  return (
    <div
      className={`absolute flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-lg ${className}`}
    >
      {label}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
