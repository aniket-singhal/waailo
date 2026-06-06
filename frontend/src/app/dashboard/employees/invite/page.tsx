'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { inviteEmployee } from '@/lib/api/employees';
import { ApiError } from '@/lib/api/types';

export default function InviteEmployeePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [asManager, setAsManager] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await inviteEmployee({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        dateOfJoining,
        asManager,
      });
      // In production the invite link is emailed; in dev the API returns the token.
      setInviteToken(res.inviteToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to invite employee');
    } finally {
      setBusy(false);
    }
  }

  if (inviteToken) {
    return (
      <Card className="max-w-lg">
        <CardTitle>Invitation sent</CardTitle>
        <p className="text-sm text-slate-600">
          {firstName} has been invited. In production they receive this link by email/WhatsApp;
          for local testing, share the activation link below so they can set a password and sign
          in.
        </p>
        <p className="mt-3 text-xs font-medium text-slate-500">Activation link</p>
        <code className="mt-1 block break-all rounded bg-slate-100 p-3 text-xs text-slate-700">
          {typeof window !== 'undefined' ? window.location.origin : ''}/accept-invite?token=
          {inviteToken}
        </code>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => router.push('/dashboard/employees')}>Back to employees</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setInviteToken(null);
              setFirstName('');
              setLastName('');
              setEmail('');
              setDateOfJoining('');
            }}
          >
            Invite another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardTitle>Invite an employee</CardTitle>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" htmlFor="fn">
            <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label="Last name" htmlFor="ln">
            <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
        </div>
        <Field label="Email" htmlFor="em">
          <Input
            id="em"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Date of joining" htmlFor="doj">
          <Input
            id="doj"
            type="date"
            value={dateOfJoining}
            onChange={(e) => setDateOfJoining(e.target.value)}
            required
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={asManager}
            onChange={(e) => setAsManager(e.target.checked)}
          />
          Grant manager role
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send invite'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
