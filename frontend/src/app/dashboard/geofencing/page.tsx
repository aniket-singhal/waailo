'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as companyApi from '@/lib/api/company';
import type { Location } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

export default function GeofencingPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLocations(await companyApi.listLocations());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load locations');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Geo-fencing</h1>
      <p className="text-sm text-slate-500">
        Set an office location and radius. When employees check in, their location is compared
        to their office geofence and flagged as inside or outside.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      {locations.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">
            No locations yet. Add one under <span className="font-medium">Company → Locations</span> first.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {locations.map((loc) => (
            <GeofenceCard key={loc.id} loc={loc} onSaved={(m) => { setMsg(m); load(); }} onError={setError} />
          ))}
        </div>
      )}
    </div>
  );
}

function GeofenceCard({
  loc,
  onSaved,
  onError,
}: {
  loc: Location;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [lat, setLat] = useState(loc.geoLat != null ? String(loc.geoLat) : '');
  const [lng, setLng] = useState(loc.geoLng != null ? String(loc.geoLng) : '');
  const [radius, setRadius] = useState(loc.geoRadiusM != null ? String(loc.geoRadiusM) : '200');
  const [busy, setBusy] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(String(pos.coords.latitude.toFixed(6)));
      setLng(String(pos.coords.longitude.toFixed(6)));
    });
  }

  async function save() {
    setBusy(true);
    try {
      await companyApi.setLocationGeofence(loc.id, {
        geoLat: lat ? Number(lat) : null,
        geoLng: lng ? Number(lng) : null,
        geoRadiusM: radius ? Number(radius) : null,
      });
      onSaved(`Geofence saved for ${loc.name}`);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Failed to save geofence');
    } finally {
      setBusy(false);
    }
  }

  const configured = loc.geoLat != null && loc.geoLng != null && loc.geoRadiusM != null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>{loc.name}</CardTitle>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            configured ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {configured ? 'Geofence on' : 'Not set'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Latitude" htmlFor={`lat-${loc.id}`}>
          <Input id={`lat-${loc.id}`} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="12.9716" />
        </Field>
        <Field label="Longitude" htmlFor={`lng-${loc.id}`}>
          <Input id={`lng-${loc.id}`} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="77.5946" />
        </Field>
        <Field label="Radius (m)" htmlFor={`rad-${loc.id}`}>
          <Input id={`rad-${loc.id}`} type="number" value={radius} onChange={(e) => setRadius(e.target.value)} />
        </Field>
        <div className="flex items-end gap-2">
          <Button variant="secondary" type="button" onClick={useMyLocation}>
            Use my location
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
