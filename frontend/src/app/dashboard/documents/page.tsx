'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import * as docsApi from '@/lib/api/documents';
import type { DocumentItem } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await docsApi.listDocuments();
      setDocs(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <UploadForm onUploaded={load} />

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No documents yet.
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{d.title}</td>
                  <td className="px-4 py-3 text-slate-600">{d.category}</td>
                  <td className="px-4 py-3 text-slate-600">{formatSize(d.sizeBytes)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(d.createdAt).toLocaleDateString()}
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

function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      // Two-step presigned flow. The actual binary PUT to the storage URL would
      // happen client-side with a real file; here we register the metadata.
      const meta = { title: title.trim(), mimeType: 'application/pdf', sizeBytes: 1024 };
      const intent = await docsApi.createUploadIntent(meta);
      await docsApi.confirmUpload({ ...meta, objectKey: intent.objectKey });
      setTitle('');
      onUploaded();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardTitle>Add a document</CardTitle>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Title" htmlFor="dtitle">
          <Input
            id="dtitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Employee handbook"
          />
        </Field>
        {err ? <p className="text-xs text-red-600">{err}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? 'Uploading…' : 'Add document'}
        </Button>
      </form>
    </Card>
  );
}
