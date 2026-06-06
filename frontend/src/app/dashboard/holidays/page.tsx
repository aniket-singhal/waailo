'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as holidaysApi from '@/lib/api/holidays';
import type { Holiday, HolidayCalendar } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';

export default function HolidaysPage() {
  const { hasRole } = useAuth();
  const isHr = hasRole('HR_ADMIN');
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadCalendars = useCallback(async () => {
    setError(null);
    try {
      const cals = await holidaysApi.listCalendars();
      setCalendars(cals);
      if (!selected && cals.length > 0) setSelected(cals[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load calendars');
    }
  }, [selected]);

  const loadHolidays = useCallback(async (calendarId: string) => {
    try {
      setHolidays(await holidaysApi.listHolidays(calendarId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load holidays');
    }
  }, []);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  useEffect(() => {
    if (selected) void loadHolidays(selected);
  }, [selected, loadHolidays]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Holidays</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {isHr ? <NewCalendar onCreated={loadCalendars} /> : null}

      <Card>
        <CardTitle>Calendars</CardTitle>
        {calendars.length === 0 ? (
          <p className="text-sm text-slate-400">No calendars yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {calendars.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  selected === c.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {c.name} ({c.year})
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected ? (
        <>
          {isHr ? <NewHoliday calendarId={selected} onAdded={() => loadHolidays(selected)} /> : null}
          <Card className="p-0">
            <div className="p-6 pb-0">
              <CardTitle>Holidays</CardTitle>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Optional</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      No holidays in this calendar.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-700">{h.date.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-slate-600">{h.name}</td>
                      <td className="px-4 py-3 text-slate-500">{h.isOptional ? 'Yes' : 'No'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function NewCalendar({ onCreated }: { onCreated: () => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await holidaysApi.createCalendar({ year: Number(year), name });
      setName('');
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to create calendar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>New calendar (HR)</CardTitle>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Year" htmlFor="cy">
          <Input id="cy" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
        </Field>
        <Field label="Name" htmlFor="cn">
          <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} placeholder="India 2026" required />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Create'}
          </Button>
        </div>
        {err ? <p className="text-sm text-red-600 sm:col-span-3">{err}</p> : null}
      </form>
    </Card>
  );
}

function NewHoliday({ calendarId, onAdded }: { calendarId: string; onAdded: () => void }) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await holidaysApi.addHoliday(calendarId, { date, name });
      setDate('');
      setName('');
      onAdded();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Failed to add holiday');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Add holiday (HR)</CardTitle>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date" htmlFor="hd">
          <Input id="hd" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Name" htmlFor="hn">
          <Input id="hn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Republic Day" required />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Add'}
          </Button>
        </div>
        {err ? <p className="text-sm text-red-600 sm:col-span-3">{err}</p> : null}
      </form>
    </Card>
  );
}
