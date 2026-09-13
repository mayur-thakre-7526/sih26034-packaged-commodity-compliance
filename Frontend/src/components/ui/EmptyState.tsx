import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-4 ring-8 ring-slate-100/50">
        {icon || <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>

      {description && (
        <p className="max-w-sm text-xs text-slate-500 mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}

export default EmptyState;
