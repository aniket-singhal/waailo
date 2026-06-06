'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as perf from '@/lib/api/performance';
import type { Goal, Review, ReviewCycle } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';

export default function PerformancePage() {
  const { hasRole } = useAuth();
  const isHr = hasRole('HR_ADMIN');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const safe = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);
    const [g, c, r] = await Promise.all([safe(perf.listGoals()), safe(perf.listCycles()), safe(perf.listReviews())]);
    if (g) setGoals(g);
    if (c) setCycles(c);
    if (r) setReviews(r);
  }, []);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Performance</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <NewGoal onCreated={load} />

      <Card>
        <CardTitle>{isHr ? 'All goals' : 'My goals'}</CardTitle>
        {goals.length === 0 ? (
          <p className="text-sm text-slate-400">No goals yet.</p>
        ) : (
          <div className="space-y-4">
            {goals.map((g) => (
              <GoalRow key={g.id} goal={g} isHr={isHr} onAct={act} />
            ))}
          </div>
        )}
      </Card>

      {isHr ? <Cycles cycles={cycles} onAct={act} /> : null}

      <Card>
        <CardTitle>{isHr ? 'All reviews' : 'My reviews'}</CardTitle>
        {isHr ? <NewReview cycles={cycles} onAct={act} /> : null}
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No reviews yet.</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            {reviews.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border border-slate-100 p-3">
                <span className="text-slate-700">
                  {isHr ? `${r.employeeName} · ` : ''}
                  {r.rating ? `★ ${r.rating}/5` : 'Not rated'}
                  {r.comments ? ` — ${r.comments}` : ''}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {r.status}
                  </span>
                  {isHr && r.status === 'PENDING' ? <SubmitReview review={r} onAct={act} /> : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function GoalRow({
  goal,
  isHr,
  onAct,
}: {
  goal: Goal;
  isHr: boolean;
  onAct: (fn: () => Promise<unknown>, s: string) => void;
}) {
  const [progress, setProgress] = useState(String(goal.progress));
  return (
    <div className="rounded-md border border-slate-100 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">{goal.title}</p>
          {isHr ? <p className="text-xs text-slate-400">{goal.employeeName}</p> : null}
        </div>
        <span className="text-xs text-slate-500">{goal.status}</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand-600" style={{ width: `${goal.progress}%` }} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
          className="flex-1"
        />
        <span className="w-10 text-xs text-slate-500">{progress}%</span>
        <Button variant="secondary" onClick={() => onAct(() => perf.updateGoal(goal.id, { progress: Number(progress) }), 'Progress updated')}>
          Save
        </Button>
        {goal.status !== 'COMPLETED' ? (
          <Button onClick={() => onAct(() => perf.updateGoal(goal.id, { status: 'COMPLETED', progress: 100 }), 'Goal completed')}>
            Complete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function NewGoal({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await perf.createGoal({ title });
      setTitle('');
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to create goal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Add a goal</CardTitle>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[260px] flex-1">
          <Field label="Goal title" htmlFor="gt">
            <Input id="gt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ship the payroll module" required />
          </Field>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add goal'}
        </Button>
        {err ? <p className="w-full text-sm text-red-600">{err}</p> : null}
      </form>
    </Card>
  );
}

function Cycles({
  cycles,
  onAct,
}: {
  cycles: ReviewCycle[];
  onAct: (fn: () => Promise<unknown>, s: string) => void;
}) {
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  return (
    <Card>
      <CardTitle>Review cycles (HR)</CardTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAct(() => perf.createCycle({ name, periodStart: start, periodEnd: end }), 'Cycle created');
          setName('');
          setStart('');
          setEnd('');
        }}
        className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4"
      >
        <Field label="Name" htmlFor="cn">
          <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} placeholder="H1 2026" required />
        </Field>
        <Field label="From" htmlFor="cs">
          <Input id="cs" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </Field>
        <Field label="To" htmlFor="cend">
          <Input id="cend" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </Field>
        <div className="flex items-end">
          <Button type="submit">Create</Button>
        </div>
      </form>
      <div className="space-y-2 text-sm">
        {cycles.length === 0 ? (
          <p className="text-slate-400">No cycles yet.</p>
        ) : (
          cycles.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded border border-slate-100 p-3">
              <span className="text-slate-700">
                {c.name} · {c.status}
              </span>
              <div className="flex gap-2">
                {c.status !== 'OPEN' ? (
                  <Button variant="secondary" onClick={() => onAct(() => perf.setCycleStatus(c.id, 'OPEN'), 'Cycle opened')}>
                    Open
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => onAct(() => perf.setCycleStatus(c.id, 'CLOSED'), 'Cycle closed')}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function NewReview({
  cycles,
  onAct,
}: {
  cycles: ReviewCycle[];
  onAct: (fn: () => Promise<unknown>, s: string) => void;
}) {
  const [cycleId, setCycleId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!cycleId || !employeeId) return;
        onAct(() => perf.createReview({ cycleId, employeeId }), 'Review created');
        setEmployeeId('');
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <Field label="Cycle" htmlFor="rc">
        <select
          id="rc"
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          required
        >
          <option value="">Select cycle…</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Employee ID" htmlFor="re">
        <Input id="re" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="employee uuid" required />
      </Field>
      <div className="flex items-end">
        <Button type="submit">Create review</Button>
      </div>
    </form>
  );
}

function SubmitReview({
  review,
  onAct,
}: {
  review: Review;
  onAct: (fn: () => Promise<unknown>, s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState('4');
  const [comments, setComments] = useState('');
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Submit
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <select value={rating} onChange={(e) => setRating(e.target.value)} className="rounded border border-slate-300 px-1 py-0.5 text-xs">
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}★
          </option>
        ))}
      </select>
      <input
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="comments"
        className="w-28 rounded border border-slate-300 px-2 py-0.5 text-xs"
      />
      <Button onClick={() => onAct(() => perf.submitReview(review.id, { rating: Number(rating), comments }), 'Review submitted')}>
        Save
      </Button>
    </span>
  );
}
