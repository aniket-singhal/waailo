'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  label: string;
  href?: string;
  soon?: boolean;
  hrOnly?: boolean;
}
interface NavGroup {
  title?: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { items: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Profile', href: '/dashboard/profile' }] },
  {
    title: 'Organization',
    items: [
      { label: 'Directory', href: '/dashboard/employees' },
      { label: 'Org Chart', soon: true },
    ],
  },
  {
    title: 'Employee Management',
    items: [
      { label: 'Employee List', href: '/dashboard/employees', hrOnly: true },
      { label: 'Onboarding', href: '/dashboard/employees/invite', hrOnly: true },
      { label: 'Offboarding', soon: true, hrOnly: true },
    ],
  },
  {
    title: 'Attendance & Leave',
    items: [
      { label: 'Attendance', href: '/dashboard/attendance' },
      { label: 'Leave', href: '/dashboard/leaves' },
      { label: 'Shift Planning', href: '/dashboard/shifts' },
      { label: 'Geo-fencing', href: '/dashboard/geofencing', hrOnly: true },
    ],
  },
  {
    title: 'Performance',
    items: [
      { label: 'Goals & Reviews', href: '/dashboard/performance' },
      { label: '360 Feedback', soon: true },
    ],
  },
  {
    title: 'Payroll',
    items: [
      { label: 'Payslips', href: '/dashboard/payroll' },
      { label: 'Salary Structures', href: '/dashboard/employees', hrOnly: true },
      { label: 'Tax Compliance', soon: true, hrOnly: true },
    ],
  },
  {
    title: 'Recruitment',
    items: [{ label: 'Job Openings', href: '/dashboard/recruitment', hrOnly: true }],
  },
  {
    title: 'Workplace',
    items: [
      { label: 'Learning & Development', soon: true },
      { label: 'Holidays & Policies', href: '/dashboard/holidays' },
      { label: 'Company Settings', href: '/dashboard/company', hrOnly: true },
      { label: 'Documents', href: '/dashboard/documents' },
      { label: 'Reporting & Analytics', soon: true, hrOnly: true },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const pathname = usePathname();
  const isHr = hasRole('HR_ADMIN');

  const visibleGroups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.hrOnly || isHr),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Waailo HR" className="h-8 w-auto" />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {visibleGroups.map((group, gi) => (
            <NavSection key={group.title ?? gi} group={group} pathname={pathname} />
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6">
          <div className="relative max-w-md flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              placeholder="Search"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
            <button
              onClick={() => logout()}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavSection({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      {group.title ? (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
        >
          {group.title}
          <span className="text-[10px]">{open ? '▾' : '▸'}</span>
        </button>
      ) : null}
      {open
        ? group.items.map((item) => <NavLink key={item.label} item={item} pathname={pathname} />)
        : null}
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  if (item.soon || !item.href) {
    return (
      <div className="flex cursor-default items-center justify-between rounded-md px-3 py-1.5 text-sm text-slate-400">
        {item.label}
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          Soon
        </span>
      </div>
    );
  }
  const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        'block rounded-md px-3 py-1.5 text-sm font-medium',
        active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      {item.label}
    </Link>
  );
}
