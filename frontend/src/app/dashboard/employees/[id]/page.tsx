'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { getEmployee, setSalary } from '@/lib/api/employees';
import type { Employee } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { toPaise } from '@/lib/utils/money';
import { useAuth } from '@/lib/auth/auth-context';

export default function EmployeeDetailPage() {
  const { hasRole } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEmployee(await getEmployee(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load employee');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/dashboard/employees')} className="text-sm text-brand-600 hover:underline">
        ← Back to employees
      </button>
      <h1 className="text-2xl font-bold text-slate-900">
        {employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'}
      </h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {employee ? (
        <Card>
          <CardTitle>Profile</CardTitle>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Code</dt>
            <dd className="font-mono text-slate-700">{employee.employeeCode}</dd>
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900">{employee.email}</dd>
            <dt className="text-slate-500">Employment</dt>
            <dd className="text-slate-900">{employee.employmentType}</dd>
            <dt className="text-slate-500">Status</dt>
            <dd className="text-slate-900">{employee.status}</dd>
            <dt className="text-slate-500">Joined</dt>
            <dd className="text-slate-900">{employee.dateOfJoining}</dd>
          </dl>
        </Card>
      ) : null}

      {hasRole('HR_ADMIN') && employee ? <SalaryForm employeeId={employee.id} /> : null}
    </div>
  );
}

function SalaryForm({ employeeId }: { employeeId: string }) {
  const [ctc, setCtc] = useState('');
  const [basic, setBasic] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const ctcPaise = toPaise(ctc);
      const basicPaise = toPaise(basic);
      await setSalary(employeeId, {
        ctcAnnual: ctcPaise,
        components: [{ code: 'BASIC', label: 'Basic', type: 'EARNING', amount: basicPaise }],
        effectiveFrom,
      });
      setMsg('Salary structure saved');
      setCtc('');
      setBasic('');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to save salary');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Set salary structure (HR)</CardTitle>
      <p className="mb-3 text-sm text-slate-500">
        Enter annual amounts in ₹. Basic must not exceed CTC; payroll derives the monthly
        figures and statutory deductions from this.
      </p>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Annual CTC (₹)" htmlFor="ctc">
          <Input id="ctc" type="number" value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="1200000" required />
        </Field>
        <Field label="Annual Basic (₹)" htmlFor="basic">
          <Input id="basic" type="number" value={basic} onChange={(e) => setBasic(e.target.value)} placeholder="600000" required />
        </Field>
        <Field label="Effective from" htmlFor="ef">
          <Input id="ef" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
        </Field>
        <div className="sm:col-span-3">
          {err ? <p className="mb-2 text-sm text-red-600">{err}</p> : null}
          {msg ? <p className="mb-2 text-sm text-green-600">{msg}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save salary'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
