'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as rec from '@/lib/api/recruitment';
import type { JobOpening } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export default function RecruitmentPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setJobs(await rec.listJobs());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load job openings');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Recruitment</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <NewJob onCreated={load} />

      <Card className="p-0">
        <div className="p-6 pb-0">
          <CardTitle>Job openings</CardTitle>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Openings</th>
              <th className="px-4 py-3 font-medium">Candidates</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No job openings yet.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr
                  key={j.id}
                  onClick={() => router.push(`/dashboard/recruitment/${j.id}`)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-brand-700">{j.title}</td>
                  <td className="px-4 py-3 text-slate-600">{j.employmentType}</td>
                  <td className="px-4 py-3 text-slate-600">{j.openings}</td>
                  <td className="px-4 py-3 text-slate-600">{j.candidateCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[j.status]}`}>
                      {j.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function NewJob({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [openings, setOpenings] = useState('1');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await rec.createJob({ title, openings: Number(openings) });
      setTitle('');
      setOpenings('1');
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to create job');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Post a job opening</CardTitle>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Field label="Title" htmlFor="jt">
            <Input id="jt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Engineer" required />
          </Field>
        </div>
        <Field label="Openings" htmlFor="jo">
          <Input id="jo" type="number" value={openings} onChange={(e) => setOpenings(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            {busy ? 'Posting…' : 'Post job'}
          </Button>
        </div>
        {err ? <p className="text-sm text-red-600 sm:col-span-4">{err}</p> : null}
      </form>
    </Card>
  );
}
