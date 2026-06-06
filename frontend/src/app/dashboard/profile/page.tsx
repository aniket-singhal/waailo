'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-context';

export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
      <Card className="max-w-lg">
        <CardTitle>Account</CardTitle>
        {user ? (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900">{user.email}</dd>
            <dt className="text-slate-500">Roles</dt>
            <dd className="text-slate-900">{user.roles.join(', ')}</dd>
            <dt className="text-slate-500">Employee record</dt>
            <dd className="text-slate-900">{user.employeeId ? 'Linked' : 'Not linked'}</dd>
          </dl>
        ) : (
          <p className="text-sm text-slate-400">Loading…</p>
        )}
      </Card>
    </div>
  );
}
