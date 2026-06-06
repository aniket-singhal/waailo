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

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      {/* Soft, blurred ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-amber-50 via-slate-100 to-brand-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(60rem_40rem_at_20%_20%,#ffffff,transparent),radial-gradient(50rem_30rem_at_80%_70%,#dbeafe,transparent)] dark:opacity-0" />

      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700"
      >
        ← Back to home
      </Link>
      <ThemeToggle className="absolute right-6 top-6" />

      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-[#fbfaf7]/95 p-8 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-[#161f31]/95">
        <Link href="/" aria-label="Waailo HR home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.svg" alt="Waailo HR" className="mx-auto mb-6 h-24 w-auto" />
        </Link>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'login' ? (
            <Field label="Company slug" htmlFor="slug">
              <Input
                id="slug"
                value={companySlug}
                onChange={(e) => setCompanySlug(e.target.value)}
                placeholder="enter your unique company slug"
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

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., yourname@company.com"
              required
            />
          </Field>

          <Field label="Password" htmlFor="password">
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

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create company'}
          </Button>
        </form>

        {mode === 'login' ? (
          <div className="mt-6">
            <div className="relative text-center">
              <span className="relative z-10 bg-[#fbfaf7] px-3 text-xs font-medium text-slate-500">
                Single Sign-On (SSO)
              </span>
              <div className="absolute left-0 top-1/2 -z-0 h-px w-full bg-slate-200" />
            </div>
            <div className="mt-4 flex justify-center gap-3">
              {[
                { k: 'Google', label: 'G' },
                { k: 'Microsoft', label: '⊞' },
                { k: 'Passkey', label: '🔑' },
              ].map((p) => (
                <button
                  key={p.k}
                  type="button"
                  title={`${p.k} SSO — not configured yet`}
                  onClick={() => setError('Single sign-on is not configured yet.')}
                  className="flex h-11 w-14 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg hover:bg-slate-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-sm">
              <button
                type="button"
                className="font-medium text-brand-600 hover:underline"
                onClick={() => setError('Password reset is available via your HR admin in this build.')}
              >
                Forgot password?
              </button>
            </p>
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-5 py-2 text-sm text-slate-600 shadow">
        {mode === 'login' ? "Don't have a company yet? " : 'Already have a company? '}
        <button
          type="button"
          className="font-semibold text-brand-600 hover:underline"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Create one' : 'Sign in'}
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
