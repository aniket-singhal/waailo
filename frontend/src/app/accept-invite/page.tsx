'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { Card, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api/types';

function AcceptInviteForm() {
  const { acceptInvite } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill the token from the invite link (?token=…).
  useEffect(() => {
    const t = params.get('token');
    if (t) setToken(t);
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await acceptInvite(token.trim(), password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept invite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardTitle>Accept your invitation</CardTitle>
        <p className="mb-4 text-sm text-slate-500">
          Set a password to activate your Waailo HR account.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Invite token" htmlFor="token">
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token from your invite"
              required
            />
          </Field>
          <Field label="New password" htmlFor="pw">
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </Field>
          <Field label="Confirm password" htmlFor="cpw">
            <Input
              id="cpw"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Activating…' : 'Activate account'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading…</div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
