'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  downloadOnboardingDoc,
  getOnboardingFor,
  listOnboarding,
  reviewOnboarding,
} from '@/lib/api/onboarding';
import type { OnboardingData, OnboardingDoc, OnboardingListItem, OnboardingStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const STATUS_STYLE: Record<OnboardingStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function str(v: unknown): string {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

export default function OnboardingReviewPage() {
  const [list, setList] = useState<OnboardingListItem[]>([]);
  const [detail, setDetail] = useState<OnboardingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await listOnboarding());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(employeeId: string) {
    setMsg(null);
    setDetail(await getOnboardingFor(employeeId));
  }

  async function review(employeeId: string, decision: 'APPROVE' | 'REJECT') {
    try {
      await reviewOnboarding(employeeId, decision);
      setMsg(decision === 'APPROVE' ? 'Onboarding approved.' : 'Onboarding rejected.');
      await load();
      await open(employeeId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  async function download(doc: OnboardingDoc) {
    const blob = await downloadOnboardingDoc(doc.id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Onboarding Review</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-slate-400">Loading…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-slate-400">No onboarding submissions yet.</td></tr>
            ) : (
              list.map((r) => (
                <tr key={r.employeeId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">
                    {r.employeeName} <span className="font-mono text-xs text-slate-400">{r.employeeCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.onboardingStatus]}`}>
                      {r.onboardingStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.updatedAt?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" onClick={() => open(r.employeeId)}>Review</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {detail ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>
              {detail.employee.firstName} {detail.employee.lastName} — onboarding
            </CardTitle>
            <button onClick={() => setDetail(null)} className="text-sm text-slate-400 hover:text-slate-600">Close ✕</button>
          </div>

          <Section title="Personal">
            <KV k="Gender" v={str(detail.employee.gender)} />
            <KV k="Date of birth" v={str(detail.employee.dateOfBirth).slice(0, 10)} />
            <KV k="Marital status" v={str(detail.employee.maritalStatus)} />
            <KV k="Nationality" v={str(detail.employee.nationality)} />
            <KV k="Blood group" v={str(detail.employee.bloodGroup)} />
            <KV k="Personal email" v={str(detail.employee.personalEmail)} />
            <KV k="Current address" v={str(detail.employee.currentAddress)} />
            <KV k="Permanent address" v={str(detail.employee.permanentAddress)} />
          </Section>

          <Section title="Statutory">
            <KV k="Aadhaar" v={str(detail.employee.aadhaarRef)} />
            <KV k="PAN" v={str(detail.employee.panRef)} />
            <KV k="UAN" v={str(detail.employee.uan)} />
            <KV k="ESIC" v={str(detail.employee.esiNumber)} />
            <KV k="Passport" v={str(detail.employee.passportNumber)} />
          </Section>

          <Section title="Bank">
            <KV k="Account holder" v={str(detail.employee.bankAccountHolder)} />
            <KV k="Bank" v={str(detail.employee.bankName)} />
            <KV k="Account no." v={str(detail.employee.bankAccount)} />
            <KV k="IFSC" v={str(detail.employee.bankIfsc)} />
            <KV k="Branch" v={str(detail.employee.bankBranch)} />
          </Section>

          <ListBlock title="Education" empty="No education records">
            {detail.education.map((e, i) => (
              <li key={i} className="text-sm text-slate-700">
                {e.qualification} — {str(e.institution)} ({str(e.yearOfPassing)}, {str(e.percentage)})
              </li>
            ))}
          </ListBlock>

          <ListBlock title="Previous employment" empty="No previous employment">
            {detail.previousEmployment.map((p, i) => (
              <li key={i} className="text-sm text-slate-700">
                {p.organization} — {str(p.designation)}; reason: {str(p.reasonForLeaving)}
              </li>
            ))}
          </ListBlock>

          <ListBlock title="Emergency contacts" empty="None">
            {detail.emergencyContacts.map((c, i) => (
              <li key={i} className="text-sm text-slate-700">
                {c.name} ({str(c.relationship)}) — {c.contactNumber}
              </li>
            ))}
          </ListBlock>

          <ListBlock title="Nominees" empty="None">
            {detail.nominees.map((n, i) => (
              <li key={i} className="text-sm text-slate-700">
                {n.name} ({str(n.relationship)}) — {str(n.sharePercent)}%
              </li>
            ))}
          </ListBlock>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Documents</h3>
            {detail.documents.length === 0 ? (
              <p className="text-sm text-slate-400">No documents uploaded.</p>
            ) : (
              <ul className="space-y-1">
                {detail.documents.map((d) => (
                  <li key={d.id} className="text-sm">
                    <button onClick={() => download(d)} className="text-brand-600 underline">{d.title}</button>{' '}
                    <span className="text-xs text-slate-400">({Math.round(d.sizeBytes / 1024)} KB)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <Button onClick={() => review(detail.employee.id, 'APPROVE')}>Approve</Button>
            <Button variant="danger" onClick={() => review(detail.employee.id, 'REJECT')}>Reject</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-slate-50 py-1 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-800">{v}</span>
    </div>
  );
}

function ListBlock({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      {arr.length === 0 ? <p className="text-sm text-slate-400">{empty}</p> : <ul className="space-y-1">{children}</ul>}
    </div>
  );
}
