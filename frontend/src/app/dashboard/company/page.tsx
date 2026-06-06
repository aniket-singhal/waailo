'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as companyApi from '@/lib/api/company';
import type { Company, Department, Designation, Location } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';

export default function CompanyPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('HR_ADMIN');
  const [company, setCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    try {
      const [c, d, ds, l] = await Promise.all([
        companyApi.getCompany(),
        companyApi.listDepartments(),
        companyApi.listDesignations(),
        companyApi.listLocations(),
      ]);
      setCompany(c);
      setDepartments(d);
      setDesignations(ds);
      setLocations(l);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load company data');
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Company</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardTitle>Details</CardTitle>
        {company ? (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Name</dt>
            <dd className="text-slate-900">{company.name}</dd>
            <dt className="text-slate-500">Slug</dt>
            <dd className="font-mono text-slate-700">{company.slug}</dd>
            <dt className="text-slate-500">Country / Currency</dt>
            <dd className="text-slate-900">
              {company.country} / {company.currency}
            </dd>
            <dt className="text-slate-500">Status</dt>
            <dd className="text-slate-900">{company.status}</dd>
          </dl>
        ) : (
          <p className="text-sm text-slate-400">Loading…</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <OrgList
          title="Departments"
          items={departments.map((d) => ({ id: d.id, label: d.name }))}
          canEdit={canEdit}
          onAdd={async (v) => {
            await companyApi.createDepartment(v);
            await loadAll();
          }}
        />
        <OrgList
          title="Designations"
          items={designations.map((d) => ({ id: d.id, label: d.title }))}
          canEdit={canEdit}
          onAdd={async (v) => {
            await companyApi.createDesignation(v);
            await loadAll();
          }}
        />
        <OrgList
          title="Locations"
          items={locations.map((l) => ({ id: l.id, label: l.name }))}
          canEdit={canEdit}
          onAdd={async (v) => {
            await companyApi.createLocation(v);
            await loadAll();
          }}
        />
      </div>
    </div>
  );
}

function OrgList({
  title,
  items,
  canEdit,
  onAdd,
}: {
  title: string;
  items: { id: string; label: string }[];
  canEdit: boolean;
  onAdd: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    if (!value.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await onAdd(value.trim());
      setValue('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to add');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <ul className="mb-3 space-y-1 text-sm text-slate-700">
        {items.length === 0 ? (
          <li className="text-slate-400">None yet</li>
        ) : (
          items.map((i) => <li key={i.id}>• {i.label}</li>)
        )}
      </ul>
      {canEdit ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={`Add ${title.slice(0, -1).toLowerCase()}`} />
            <Button onClick={add} disabled={busy}>
              Add
            </Button>
          </div>
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
