'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as leavesApi from '@/lib/api/leaves';
import type { LeaveBalance, LeaveRequest, LeaveType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';

export default function LeavesPage() {
  const { hasRole } = useAuth();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? id;

  const load = useCallback(async () => {
    setError(null);
    // Load each section independently — admins (e.g. OWNER) may have no employee
    // record, so personal balances can 404 without breaking the rest of the page.
    try {
      setTypes(await leavesApi.listLeaveTypes());
    } catch {
      /* ignore */
    }
    try {
      setBalances(await leavesApi.getBalances());
    } catch {
      setBalances([]);
    }
    try {
      setRequests(await leavesApi.listLeaveRequests());
    } catch {
      setRequests([]);
    }
    if (hasRole('MANAGER')) {
      try {
        setPending(await leavesApi.listPendingLeaves());
      } catch {
        /* ignore */
      }
    }
  }, [hasRole]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(success);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Leaves</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-500">Balances ({new Date().getFullYear()})</h2>
        {balances.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-400">
              No balances yet. {hasRole('HR_ADMIN') ? 'Create a leave type and policy below.' : ''}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {balances.map((b) => (
              <Card key={b.id}>
                <p className="text-sm font-medium text-slate-700">{typeName(b.leaveTypeId)}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{b.available}</p>
                <p className="text-xs text-slate-400">
                  {b.used} used · {b.pending} pending · {b.accrued} accrued
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {types.length > 0 ? <ApplyForm types={types} onApply={load} /> : null}

      {hasRole('MANAGER') && pending.length > 0 ? (
        <Card>
          <CardTitle>Pending approvals</CardTitle>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border border-slate-100 p-3 text-sm">
                <span className="text-slate-700">
                  {typeName(r.leaveTypeId)} · {r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)} ({r.days}d)
                </span>
                <div className="flex gap-2">
                  <Button onClick={() => act(() => leavesApi.decideLeave(r.id, 'APPROVE'), 'Approved')}>
                    Approve
                  </Button>
                  <Button variant="danger" onClick={() => act(() => leavesApi.decideLeave(r.id, 'REJECT'), 'Rejected')}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-0">
        <div className="p-6 pb-0">
          <CardTitle>My requests</CardTitle>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Days</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No leave requests yet.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{typeName(r.leaveTypeId)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.days}</td>
                  <td className="px-4 py-3 text-slate-600">{r.status}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'PENDING' || r.status === 'APPROVED' ? (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => act(() => leavesApi.cancelLeave(r.id), 'Cancelled')}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {hasRole('HR_ADMIN') ? <ManageTypes onChange={load} /> : null}
    </div>
  );
}

function ApplyForm({ types, onApply }: { types: LeaveType[]; onApply: () => void }) {
  const [leaveTypeId, setLeaveTypeId] = useState(types[0]?.id ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await leavesApi.applyLeave({ leaveTypeId, startDate, endDate, reason: reason || undefined });
      setStartDate('');
      setEndDate('');
      setReason('');
      onApply();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to apply');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Apply for leave</CardTitle>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Type" htmlFor="lt">
          <select
            id="lt"
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From" htmlFor="ls">
          <Input id="ls" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </Field>
        <Field label="To" htmlFor="le">
          <Input id="le" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </Field>
        <Field label="Reason" htmlFor="lr">
          <Input id="lr" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        </Field>
        <div className="sm:col-span-4">
          {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}
          <Button type="submit" disabled={busy || !leaveTypeId}>
            {busy ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ManageTypes({ onChange }: { onChange: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [quota, setQuota] = useState('12');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const type = await leavesApi.createLeaveType({ code, name });
      await leavesApi.createLeavePolicy({
        leaveTypeId: type.id,
        annualQuota: Number(quota),
        effectiveFrom: `${new Date().getFullYear()}-01-01`,
      });
      setCode('');
      setName('');
      setQuota('12');
      onChange();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to create');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Add leave type &amp; policy (HR)</CardTitle>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Code" htmlFor="tc">
          <Input id="tc" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CL" required />
        </Field>
        <Field label="Name" htmlFor="tn">
          <Input id="tn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Casual Leave" required />
        </Field>
        <Field label="Annual quota (days)" htmlFor="tq">
          <Input id="tq" type="number" value={quota} onChange={(e) => setQuota(e.target.value)} required />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Create'}
          </Button>
        </div>
        {err ? <p className="text-sm text-red-600 sm:col-span-4">{err}</p> : null}
      </form>
    </Card>
  );
}
