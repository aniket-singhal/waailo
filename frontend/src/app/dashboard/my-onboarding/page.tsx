'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import {
  downloadOnboardingDoc,
  getMyOnboarding,
  saveMyOnboarding,
  submitMyOnboarding,
  uploadOnboardingDoc,
  type SaveOnboardingInput,
} from '@/lib/api/onboarding';
import type {
  OnboardingData,
  OnboardingDoc,
  OnboardingEducation,
  OnboardingEmergency,
  OnboardingNominee,
  OnboardingPrevEmp,
  OnboardingStatus,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const STATUS_STYLE: Record<OnboardingStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const REQUIRED_DOCS = [
  'Aadhaar Card',
  'PAN Card',
  'Passport Size Photograph',
  'Cancelled Cheque / Bank Proof',
  'Educational Certificates',
  'Experience Letter',
  'Relieving Letter',
  'Last 3 Salary Slips',
  'Signed Offer Letter',
];

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

export default function MyOnboardingPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [form, setForm] = useState<SaveOnboardingInput>({});
  const [education, setEducation] = useState<OnboardingEducation[]>([]);
  const [prevEmp, setPrevEmp] = useState<OnboardingPrevEmp[]>([]);
  const [emergency, setEmergency] = useState<OnboardingEmergency[]>([]);
  const [nominees, setNominees] = useState<OnboardingNominee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await getMyOnboarding();
      setData(d);
      const e = d.employee;
      setForm({
        gender: str(e.gender),
        dateOfBirth: str(e.dateOfBirth).slice(0, 10),
        maritalStatus: str(e.maritalStatus),
        nationality: str(e.nationality),
        bloodGroup: str(e.bloodGroup),
        personalEmail: str(e.personalEmail),
        alternatePhone: str(e.alternatePhone),
        currentAddress: str(e.currentAddress),
        permanentAddress: str(e.permanentAddress),
        aadhaarRef: str(e.aadhaarRef),
        panRef: str(e.panRef),
        uan: str(e.uan),
        prevPfMember: Boolean(e.prevPfMember),
        esiNumber: str(e.esiNumber),
        passportNumber: str(e.passportNumber),
        passportExpiry: str(e.passportExpiry).slice(0, 10),
        drivingLicense: str(e.drivingLicense),
        drivingLicenseExpiry: str(e.drivingLicenseExpiry).slice(0, 10),
        bankAccountHolder: str(e.bankAccountHolder),
        bankName: str(e.bankName),
        bankAccount: str(e.bankAccount),
        bankIfsc: str(e.bankIfsc),
        bankBranch: str(e.bankBranch),
      });
      setEducation(d.education ?? []);
      setPrevEmp(d.previousEmployment ?? []);
      setEmergency(d.emergencyContacts ?? []);
      setNominees(d.nominees ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load onboarding');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const set = (k: keyof SaveOnboardingInput, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save(submit = false) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await saveMyOnboarding({
        ...form,
        education,
        previousEmployment: prevEmp,
        emergencyContacts: emergency,
        nominees,
      });
      if (submit) {
        await submitMyOnboarding();
        setMsg('Onboarding submitted for HR review.');
      } else {
        setMsg('Saved.');
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function upload(docType: string, file: File | null) {
    if (!file) return;
    setError(null);
    try {
      await uploadOnboardingDoc(file, docType);
      setMsg(`Uploaded ${docType}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    }
  }

  async function download(doc: OnboardingDoc) {
    const blob = await downloadOnboardingDoc(doc.id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  if (loading) return <Card><p className="text-sm text-slate-400">Loading…</p></Card>;
  if (!data)
    return <p className="text-sm text-red-600">{error ?? 'Onboarding is available to employees only.'}</p>;

  const status = data.onboardingStatus;
  const locked = status === 'APPROVED';

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Onboarding</h1>
        <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
          {status.replace(/_/g, ' ')}
        </span>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}
      {locked ? (
        <p className="rounded bg-green-50 p-3 text-sm text-green-700">
          Your onboarding has been approved. Details are locked.
        </p>
      ) : null}

      <Card>
        <CardTitle>1. Personal information</CardTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Gender" htmlFor="g"><Input id="g" value={form.gender ?? ''} onChange={(e) => set('gender', e.target.value)} /></Field>
          <Field label="Date of birth" htmlFor="dob"><Input id="dob" type="date" value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
          <Field label="Marital status" htmlFor="ms"><Input id="ms" value={form.maritalStatus ?? ''} onChange={(e) => set('maritalStatus', e.target.value)} /></Field>
          <Field label="Nationality" htmlFor="nat"><Input id="nat" value={form.nationality ?? ''} onChange={(e) => set('nationality', e.target.value)} /></Field>
          <Field label="Blood group" htmlFor="bg"><Input id="bg" value={form.bloodGroup ?? ''} onChange={(e) => set('bloodGroup', e.target.value)} /></Field>
          <Field label="Personal email" htmlFor="pe"><Input id="pe" type="email" value={form.personalEmail ?? ''} onChange={(e) => set('personalEmail', e.target.value)} /></Field>
          <Field label="Alternate contact" htmlFor="ap"><Input id="ap" value={form.alternatePhone ?? ''} onChange={(e) => set('alternatePhone', e.target.value)} /></Field>
          <div />
          <Field label="Current address" htmlFor="ca"><Input id="ca" value={form.currentAddress ?? ''} onChange={(e) => set('currentAddress', e.target.value)} /></Field>
          <Field label="Permanent address" htmlFor="pa"><Input id="pa" value={form.permanentAddress ?? ''} onChange={(e) => set('permanentAddress', e.target.value)} /></Field>
        </div>
      </Card>

      <Card>
        <CardTitle>2. Identity &amp; statutory</CardTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Aadhaar number" htmlFor="aad"><Input id="aad" value={form.aadhaarRef ?? ''} onChange={(e) => set('aadhaarRef', e.target.value)} /></Field>
          <Field label="PAN number" htmlFor="pan"><Input id="pan" value={form.panRef ?? ''} onChange={(e) => set('panRef', e.target.value)} /></Field>
          <Field label="UAN number" htmlFor="uan"><Input id="uan" value={form.uan ?? ''} onChange={(e) => set('uan', e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.prevPfMember ?? false} onChange={(e) => set('prevPfMember', e.target.checked)} />
            Previous PF member
          </label>
          <Field label="ESIC IP number" htmlFor="esi"><Input id="esi" value={form.esiNumber ?? ''} onChange={(e) => set('esiNumber', e.target.value)} /></Field>
          <div />
          <Field label="Passport number" htmlFor="pp"><Input id="pp" value={form.passportNumber ?? ''} onChange={(e) => set('passportNumber', e.target.value)} /></Field>
          <Field label="Passport expiry" htmlFor="ppe"><Input id="ppe" type="date" value={form.passportExpiry ?? ''} onChange={(e) => set('passportExpiry', e.target.value)} /></Field>
          <Field label="Driving license" htmlFor="dl"><Input id="dl" value={form.drivingLicense ?? ''} onChange={(e) => set('drivingLicense', e.target.value)} /></Field>
          <Field label="License expiry" htmlFor="dle"><Input id="dle" type="date" value={form.drivingLicenseExpiry ?? ''} onChange={(e) => set('drivingLicenseExpiry', e.target.value)} /></Field>
        </div>
      </Card>

      <Card>
        <CardTitle>3. Bank details</CardTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Account holder name" htmlFor="ah"><Input id="ah" value={form.bankAccountHolder ?? ''} onChange={(e) => set('bankAccountHolder', e.target.value)} /></Field>
          <Field label="Bank name" htmlFor="bn"><Input id="bn" value={form.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} /></Field>
          <Field label="Account number" htmlFor="ba"><Input id="ba" value={form.bankAccount ?? ''} onChange={(e) => set('bankAccount', e.target.value)} /></Field>
          <Field label="IFSC code" htmlFor="if"><Input id="if" value={form.bankIfsc ?? ''} onChange={(e) => set('bankIfsc', e.target.value)} /></Field>
          <Field label="Branch name" htmlFor="br"><Input id="br" value={form.bankBranch ?? ''} onChange={(e) => set('bankBranch', e.target.value)} /></Field>
        </div>
      </Card>

      <RepeatSection<OnboardingEducation>
        title="4. Educational details"
        rows={education}
        setRows={setEducation}
        empty={{ qualification: '' }}
        columns={[
          { key: 'qualification', label: 'Qualification' },
          { key: 'institution', label: 'Institution' },
          { key: 'board', label: 'Board / University' },
          { key: 'yearOfPassing', label: 'Year', type: 'number' },
          { key: 'percentage', label: '%/CGPA' },
        ]}
      />

      <RepeatSection<OnboardingPrevEmp>
        title="5. Previous employment"
        rows={prevEmp}
        setRows={setPrevEmp}
        empty={{ organization: '' }}
        columns={[
          { key: 'organization', label: 'Organization' },
          { key: 'designation', label: 'Designation' },
          { key: 'fromDate', label: 'From', type: 'date' },
          { key: 'toDate', label: 'To', type: 'date' },
          { key: 'reasonForLeaving', label: 'Reason for leaving' },
        ]}
      />

      <RepeatSection<OnboardingEmergency>
        title="6. Emergency contacts"
        rows={emergency}
        setRows={setEmergency}
        empty={{ name: '', contactNumber: '' }}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'relationship', label: 'Relationship' },
          { key: 'contactNumber', label: 'Contact number' },
          { key: 'alternateNumber', label: 'Alternate number' },
          { key: 'address', label: 'Address' },
        ]}
      />

      <RepeatSection<OnboardingNominee>
        title="7. Nominee details"
        rows={nominees}
        setRows={setNominees}
        empty={{ name: '' }}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'relationship', label: 'Relationship' },
          { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
          { key: 'contactNumber', label: 'Contact number' },
          { key: 'sharePercent', label: 'Share %', type: 'number' },
        ]}
      />

      <Card>
        <CardTitle>8. Document uploads</CardTitle>
        <div className="space-y-2">
          {REQUIRED_DOCS.map((docType) => {
            const existing = data.documents.filter((d) => d.title === docType);
            return (
              <div key={docType} className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-2 text-sm">
                <span className="w-56 shrink-0 text-slate-700">{docType}</span>
                <input
                  type="file"
                  disabled={locked}
                  onChange={(e) => upload(docType, e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
                {existing.map((d) => (
                  <button key={d.id} onClick={() => download(d)} className="text-xs text-brand-600 underline">
                    View uploaded
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      {!locked ? (
        <div className="flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => save(false)}>
            {busy ? 'Saving…' : 'Save draft'}
          </Button>
          <Button disabled={busy} onClick={() => save(true)}>
            {busy ? 'Submitting…' : 'Save & submit for review'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface Column<T> {
  key: keyof T;
  label: string;
  type?: 'text' | 'number' | 'date';
}

function RepeatSection<T extends object>({
  title,
  rows,
  setRows,
  empty,
  columns,
}: {
  title: string;
  rows: T[];
  setRows: (r: T[]) => void;
  empty: T;
  columns: Column<T>[];
}) {
  function update(i: number, key: keyof T, value: string) {
    const next = [...rows];
    const col = columns.find((c) => c.key === key);
    next[i] = { ...next[i], [key]: col?.type === 'number' ? (value ? Number(value) : undefined) : value };
    setRows(next);
  }
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button type="button" variant="secondary" onClick={() => setRows([...rows, { ...empty }])}>
          + Add
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">None added.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 border-b border-slate-100 pb-3 md:grid-cols-3">
              {columns.map((c) => (
                <label key={String(c.key)} className="text-xs">
                  <span className="mb-1 block text-slate-500">{c.label}</span>
                  <input
                    type={c.type === 'date' ? 'date' : c.type === 'number' ? 'number' : 'text'}
                    value={row[c.key] === undefined || row[c.key] === null ? '' : String(row[c.key]).slice(0, c.type === 'date' ? 10 : undefined)}
                    onChange={(e) => update(i, c.key, e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
              <div className="flex items-end">
                <Button type="button" variant="danger" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
