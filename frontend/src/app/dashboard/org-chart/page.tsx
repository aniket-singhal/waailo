'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { listEmployees } from '@/lib/api/employees';
import { listDesignations } from '@/lib/api/company';
import type { Designation, Employee } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';

interface Node extends Employee {
  children: Node[];
}

function buildTree(employees: Employee[]): Node[] {
  const byId = new Map<string, Node>();
  employees.forEach((e) => byId.set(e.id, { ...e, children: [] }));
  const roots: Node[] = [];
  byId.forEach((node) => {
    const parent = node.managerId ? byId.get(node.managerId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

export default function OrgChartPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [emps, desigs] = await Promise.all([
          listEmployees({ pageSize: 500 }),
          listDesignations().catch(() => [] as Designation[]),
        ]);
        // Show only joined employees (exclude pure invites with no manager linkage noise).
        setEmployees(emps.data.filter((e) => e.status !== 'CANCELLED'));
        setTitles(new Map(desigs.map((d) => [d.id, d.title])));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load org chart');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tree = buildTree(employees);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Org Chart</h1>
      <p className="text-sm text-slate-500">Reporting hierarchy built from each employee&apos;s manager.</p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <Card><p className="text-sm text-slate-400">Loading…</p></Card>
      ) : employees.length === 0 ? (
        <Card><p className="text-sm text-slate-400">No employees yet.</p></Card>
      ) : (
        <Card className="overflow-x-auto">
          <div className="min-w-fit space-y-2">
            {tree.map((root) => (
              <OrgNode key={root.id} node={root} titles={titles} depth={0} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function OrgNode({ node, titles, depth }: { node: Node; titles: Map<string, string>; depth: number }) {
  return (
    <div className={depth > 0 ? 'ml-6 border-l border-slate-200 pl-4' : ''}>
      <div className="my-1 inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
          {node.firstName.charAt(0)}
          {node.lastName.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-900">
            {node.firstName} {node.lastName}{' '}
            <span className="font-mono text-xs text-slate-400">{node.employeeCode}</span>
          </div>
          <div className="text-xs text-slate-500">
            {node.designationId ? titles.get(node.designationId) ?? '—' : '—'}
            {node.children.length > 0 ? ` · ${node.children.length} report${node.children.length > 1 ? 's' : ''}` : ''}
          </div>
        </div>
      </div>
      {node.children.length > 0 ? (
        <div className="space-y-1">
          {node.children.map((c) => (
            <OrgNode key={c.id} node={c} titles={titles} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
