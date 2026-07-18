'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { listNotifications } from '@/lib/api/notifications';
import type { NotificationItem } from '@/lib/api/types';
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
      { label: 'Org Chart', href: '/dashboard/org-chart' },
    ],
  },
  {
    title: 'Employee Management',
    items: [
      { label: 'Employee List', href: '/dashboard/employees', hrOnly: true },
      { label: 'Add / Invite', href: '/dashboard/employees/invite', hrOnly: true },
      { label: 'My Onboarding', href: '/dashboard/my-onboarding' },
      { label: 'Onboarding Review', href: '/dashboard/onboarding', hrOnly: true },
      { label: 'Offboarding', href: '/dashboard/offboarding', hrOnly: true },
    ],
  },
  {
    title: 'Attendance & Leave',
    items: [
      { label: 'Attendance', href: '/dashboard/attendance' },
      { label: 'My Attendance', href: '/dashboard/attendance/me' },
      { label: 'Leave', href: '/dashboard/leaves' },
      { label: 'Leave Overview', href: '/dashboard/leaves/overview' },
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
      { label: 'Reporting & Analytics', href: '/dashboard/reports', hrOnly: true },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const pathname = usePathname();
  const isHr = hasRole('HR_ADMIN');

  const [open, setOpen] = useState(true);
  const [menu, setMenu] = useState<null | 'bell' | 'user'>(null);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);

  useEffect(() => {
    listNotifications(1, 8)
      .then((r) => setNotifs(r.data))
      .catch(() => setNotifs([]));
  }, []);

  const visibleGroups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.hrOnly || isHr),
  })).filter((g) => g.items.length > 0);

  const emailName = (user?.email ?? 'user').split('@')[0];
  const initials = emailName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Backdrop (mobile) */}
      {open ? (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform md:static dark:border-slate-800 dark:bg-slate-900',
          open ? 'flex' : 'hidden',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Waailo HR" className="h-8 w-auto" />
          <button
            onClick={() => setOpen(false)}
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {visibleGroups.map((group, gi) => (
            <NavSection key={group.title ?? gi} group={group} pathname={pathname} />
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ☰
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              placeholder="Search"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setMenu(menu === 'bell' ? null : 'bell')}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                🔔
                {notifs.length > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {notifs.length}
                  </span>
                ) : null}
              </button>
              {menu === 'bell' ? (
                <Dropdown onClose={() => setMenu(null)}>
                  <p className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    Notifications
                  </p>
                  {notifs.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-slate-400">No notifications.</p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto">
                      {notifs.map((n) => (
                        <li key={n.id} className="border-b border-slate-50 px-4 py-2 text-sm last:border-0 dark:border-slate-800">
                          <span className="block text-slate-700 dark:text-slate-200">{n.eventKey.replace(/[._]/g, ' ')}</span>
                          <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Dropdown>
              ) : null}
            </div>

            {/* Avatar + name */}
            <div className="relative">
              <button
                onClick={() => setMenu(menu === 'user' ? null : 'user')}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden text-sm font-medium capitalize text-slate-700 sm:inline dark:text-slate-200">
                  {emailName}
                </span>
                <span className="text-xs text-slate-400">▾</span>
              </button>
              {menu === 'user' ? (
                <Dropdown onClose={() => setMenu(null)}>
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                    <p className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">{emailName}</p>
                    <p className="truncate text-xs text-slate-400">{user?.email}</p>
                  </div>
                  <Link href="/dashboard/profile" onClick={() => setMenu(null)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                    My Profile
                  </Link>
                  {isHr ? (
                    <Link href="/dashboard/company" onClick={() => setMenu(null)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                      Company Settings
                    </Link>
                  ) : null}
                  <button
                    onClick={() => logout()}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </Dropdown>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function Dropdown({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {children}
      </div>
    </>
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
