'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { inviteEmployee, listEmployees, type InviteEmployeeInput } from '@/lib/api/employees';
import {
  listBusinessUnits,
  listCostCenters,
  listDepartments,
  listDesignations,
  listGrades,
  listLocations,
} from '@/lib/api/company';
import type {
  BusinessUnit,
  CostCenter,
  Department,
  Designation,
  Employee,
  Grade,
  Location,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

type Ref = { id: string; label: string };

function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Ref[];
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function InviteEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState<InviteEmployeeInput>({
    firstName: '',
    lastName: '',
    email: '',
    dateOfJoining: '',
    employmentType: 'FULL_TIME',
    role: 'EMPLOYEE',
    payrollActive: true,
  });
  const set = (k: keyof InviteEmployeeInput, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [dep, des, loc, bu, gr, cc, emps] = await Promise.all([
        listDepartments().catch(() => []),
        listDesignations().catch(() => []),
        listLocations().catch(() => []),
        listBusinessUnits().catch(() => []),
        listGrades().catch(() => []),
        listCostCenters().catch(() => []),
        listEmployees({ pageSize: 200 }).catch(() => ({ data: [] as Employee[] })),
      ]);
      setDepartments(dep);
      setDesignations(des);
      setLocations(loc);
      setBusinessUnits(bu);
      setGrades(gr);
      setCostCenters(cc);
      setManagers(emps.data);
    })();
  }, []);

  const empRefs: Ref[] = managers.map((m) => ({
    id: m.id,
    label: `${m.firstName} ${m.lastName} (${m.employeeCode})`,
  }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Drop empty strings so optional fields aren't sent blank.
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== undefined),
      ) as unknown as InviteEmployeeInput;
      const res = await inviteEmployee(payload);
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
          {form.firstName} has been invited. In production they receive this link by email/WhatsApp;
          for local testing, share the activation link below so they can set a password, sign in,
          and complete their onboarding form.
        </p>
        <code className="mt-3 block break-all rounded bg-slate-100 p-3 text-xs text-slate-700">
          {typeof window !== 'undefined' ? window.location.origin : ''}/accept-invite?token=
          {inviteToken}
        </code>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => router.push('/dashboard/employees')}>Back to employees</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Invite another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Add / invite employee</h1>
        <Button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send invite'}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardTitle>Basic information</CardTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="First name *" htmlFor="fn">
            <Input id="fn" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
          </Field>
          <Field label="Last name *" htmlFor="ln">
            <Input id="ln" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          </Field>
          <Field label="Official email *" htmlFor="em">
            <Input id="em" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </Field>
          <Field label="Personal email" htmlFor="pem">
            <Input id="pem" type="email" value={form.personalEmail ?? ''} onChange={(e) => set('personalEmail', e.target.value)} />
          </Field>
          <Field label="Mobile number" htmlFor="ph">
            <Input id="ph" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Employee code (optional)" htmlFor="code">
            <Input id="code" value={form.employeeCode ?? ''} onChange={(e) => set('employeeCode', e.target.value)} placeholder="Auto-generated if blank" />
          </Field>
          <Select label="Gender" value={form.gender ?? ''} onChange={(v) => set('gender', v)} options={[{ id: 'Male', label: 'Male' }, { id: 'Female', label: 'Female' }, { id: 'Other', label: 'Other' }]} />
          <Field label="Date of birth" htmlFor="dob">
            <Input id="dob" type="date" value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Employment &amp; org</CardTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Date of joining *" htmlFor="doj">
            <Input id="doj" type="date" value={form.dateOfJoining} onChange={(e) => set('dateOfJoining', e.target.value)} required />
          </Field>
          <Select
            label="Employment type *"
            value={form.employmentType ?? 'FULL_TIME'}
            onChange={(v) => set('employmentType', v)}
            options={[
              { id: 'FULL_TIME', label: 'Permanent / Full-time' },
              { id: 'PROBATION', label: 'Probation' },
              { id: 'CONTRACT', label: 'Contractual' },
              { id: 'INTERN', label: 'Intern' },
              { id: 'CONSULTANT', label: 'Consultant' },
            ]}
            placeholder="Select type"
          />
          <Select label="Department *" value={form.departmentId ?? ''} onChange={(v) => set('departmentId', v)} options={departments.map((d) => ({ id: d.id, label: d.name }))} />
          <Select label="Designation *" value={form.designationId ?? ''} onChange={(v) => set('designationId', v)} options={designations.map((d) => ({ id: d.id, label: d.title }))} />
          <Select label="Reporting manager" value={form.managerId ?? ''} onChange={(v) => set('managerId', v)} options={empRefs} />
          <Select label="Reviewing manager" value={form.reviewingManagerId ?? ''} onChange={(v) => set('reviewingManagerId', v)} options={empRefs} />
          <Select label="Department head" value={form.departmentHeadId ?? ''} onChange={(v) => set('departmentHeadId', v)} options={empRefs} />
          <Select label="Business unit" value={form.businessUnitId ?? ''} onChange={(v) => set('businessUnitId', v)} options={businessUnits.map((b) => ({ id: b.id, label: b.name }))} />
          <Select label="Grade / band" value={form.gradeId ?? ''} onChange={(v) => set('gradeId', v)} options={grades.map((g) => ({ id: g.id, label: g.name }))} />
          <Select label="Work location *" value={form.locationId ?? ''} onChange={(v) => set('locationId', v)} options={locations.map((l) => ({ id: l.id, label: l.name }))} />
          <Select label="Cost center" value={form.costCenterId ?? ''} onChange={(v) => set('costCenterId', v)} options={costCenters.map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))} />
        </div>
      </Card>

      <Card>
        <CardTitle>Payroll &amp; statutory</CardTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.payrollActive ?? true} onChange={(e) => set('payrollActive', e.target.checked)} />
            Payroll active
          </label>
          <div />
          <Field label="PAN number" htmlFor="pan"><Input id="pan" value={form.panRef ?? ''} onChange={(e) => set('panRef', e.target.value)} /></Field>
          <Field label="UAN number" htmlFor="uan"><Input id="uan" value={form.uan ?? ''} onChange={(e) => set('uan', e.target.value)} /></Field>
          <Field label="ESIC number" htmlFor="esi"><Input id="esi" value={form.esiNumber ?? ''} onChange={(e) => set('esiNumber', e.target.value)} /></Field>
          <Field label="Account holder name" htmlFor="ah"><Input id="ah" value={form.bankAccountHolder ?? ''} onChange={(e) => set('bankAccountHolder', e.target.value)} /></Field>
          <Field label="Bank name" htmlFor="bn"><Input id="bn" value={form.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} /></Field>
          <Field label="Bank account number" htmlFor="ba"><Input id="ba" value={form.bankAccount ?? ''} onChange={(e) => set('bankAccount', e.target.value)} /></Field>
          <Field label="IFSC code" htmlFor="ifsc"><Input id="ifsc" value={form.bankIfsc ?? ''} onChange={(e) => set('bankIfsc', e.target.value)} /></Field>
          <Field label="Branch" htmlFor="br"><Input id="br" value={form.bankBranch ?? ''} onChange={(e) => set('bankBranch', e.target.value)} /></Field>
        </div>
      </Card>

      <Card>
        <CardTitle>System &amp; access</CardTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Portal role"
            value={form.role ?? 'EMPLOYEE'}
            onChange={(v) => set('role', v)}
            options={[
              { id: 'EMPLOYEE', label: 'Employee' },
              { id: 'MANAGER', label: 'Manager' },
              { id: 'HR_ADMIN', label: 'HR / Admin' },
            ]}
            placeholder="Select role"
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send invite'}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
