'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as rec from '@/lib/api/recruitment';
import type { Candidate, CandidateStage, JobOpening } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { toPaise } from '@/lib/utils/money';

const STAGES: CandidateStage[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = String(params.id);
  const [job, setJob] = useState<JobOpening | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [offerFor, setOfferFor] = useState<Candidate | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [j, c] = await Promise.all([rec.getJob(jobId), rec.listCandidates(jobId)]);
      setJob(j);
      setCandidates(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load job');
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, success: string) {
    setError(null);
    setMsg(null);
    try {
      await fn();
      setMsg(success);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  async function hire(c: Candidate) {
    try {
      const res = await rec.hireCandidate(c.id);
      setInviteToken(res.inviteToken);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hire failed');
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/dashboard/recruitment')} className="text-sm text-brand-600 hover:underline">
        ← Back to recruitment
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{job?.title ?? 'Job'}</h1>
        {job ? (
          <div className="flex gap-2">
            {job.status !== 'CLOSED' ? (
              <Button variant="secondary" onClick={() => act(() => rec.setJobStatus(jobId, 'CLOSED'), 'Job closed')}>
                Close job
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => act(() => rec.setJobStatus(jobId, 'OPEN'), 'Job reopened')}>
                Reopen
              </Button>
            )}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <AddCandidate jobId={jobId} onAdded={load} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STAGES.map((stage) => {
          const inStage = candidates.filter((c) => c.stage === stage);
          return (
            <Card key={stage} className="p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">{stage}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{inStage.length}</span>
              </div>
              <div className="space-y-2 p-3">
                {inStage.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-slate-400">—</p>
                ) : (
                  inStage.map((c) => (
                    <div key={c.id} className="rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.stage !== 'HIRED' && c.stage !== 'REJECTED' && c.stage !== 'OFFER' ? (
                          <button
                            onClick={() => act(() => rec.advanceCandidate(c.id), 'Advanced')}
                            className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700"
                          >
                            Advance
                          </button>
                        ) : null}
                        {c.stage === 'INTERVIEW' || c.stage === 'SCREENING' ? (
                          <button
                            onClick={() => setOfferFor(c)}
                            className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          >
                            Offer
                          </button>
                        ) : null}
                        {c.stage === 'OFFER' ? (
                          <button
                            onClick={() => hire(c)}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            Hire
                          </button>
                        ) : null}
                        {c.stage !== 'HIRED' && c.stage !== 'REJECTED' ? (
                          <button
                            onClick={() => act(() => rec.rejectCandidate(c.id), 'Rejected')}
                            className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            Reject
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {offerFor ? (
        <OfferModal
          candidate={offerFor}
          onClose={() => setOfferFor(null)}
          onDone={async () => {
            setOfferFor(null);
            await load();
          }}
        />
      ) : null}

      {inviteToken ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setInviteToken(null)}>
          <Card className="max-w-md" >
            <CardTitle>Candidate hired 🎉</CardTitle>
            <p className="text-sm text-slate-600">
              An employee invite was created. Share this activation link so they can set a password:
            </p>
            <code className="mt-3 block break-all rounded bg-slate-100 p-3 text-xs text-slate-700">
              {typeof window !== 'undefined' ? window.location.origin : ''}/accept-invite?token={inviteToken}
            </code>
            <div className="mt-4">
              <Button onClick={() => setInviteToken(null)}>Done</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function AddCandidate({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await rec.addCandidate(jobId, { firstName, lastName, email });
      setFirstName('');
      setLastName('');
      setEmail('');
      onAdded();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to add candidate');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Add candidate</CardTitle>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="First name" htmlFor="cf">
          <Input id="cf" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </Field>
        <Field label="Last name" htmlFor="cl">
          <Input id="cl" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </Field>
        <Field label="Email" htmlFor="ce">
          <Input id="ce" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add'}
          </Button>
        </div>
        {err ? <p className="text-sm text-red-600 sm:col-span-4">{err}</p> : null}
      </form>
    </Card>
  );
}

function OfferModal({
  candidate,
  onClose,
  onDone,
}: {
  candidate: Candidate;
  onClose: () => void;
  onDone: () => void;
}) {
  const [ctc, setCtc] = useState('');
  const [joining, setJoining] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await rec.makeOffer(candidate.id, { ctcAnnual: toPaise(ctc), joiningDate: joining });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to make offer');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <Card className="max-w-md" >
        <div onClick={(e) => e.stopPropagation()}>
          <CardTitle>
            Make offer — {candidate.firstName} {candidate.lastName}
          </CardTitle>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Annual CTC (₹)" htmlFor="oc">
              <Input id="oc" type="number" value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="1200000" required />
            </Field>
            <Field label="Joining date" htmlFor="oj">
              <Input id="oj" type="date" value={joining} onChange={(e) => setJoining(e.target.value)} required />
            </Field>
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send offer'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
