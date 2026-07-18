import { cn } from '@/lib/utils/cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-semibold text-slate-900">{children}</h2>;
}
