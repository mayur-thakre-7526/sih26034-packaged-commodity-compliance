import type { ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  retryAction?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Unable to Load Data',
  message = 'An unexpected error occurred while communicating with the server.',
  icon,
  retryAction,
  retryLabel = 'Try Again',
  action,
  compact = false,
  className,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center justify-between p-4 rounded-md border border-rose-200 bg-rose-50 text-rose-900',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="text-rose-600 shrink-0">
            {icon || <AlertCircle className="h-5 w-5" aria-hidden="true" />}
          </div>
          <div>
            <h4 className="text-xs font-semibold">{title}</h4>
            {message && <p className="text-xs text-rose-700 mt-0.5">{message}</p>}
          </div>
        </div>

        {retryAction && (
          <Button
            size="sm"
            variant="outline"
            onClick={retryAction}
            className="border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0 ml-4"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-rose-200 bg-rose-50/30',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4 ring-8 ring-rose-100/50">
        {icon || <AlertCircle className="h-6 w-6" aria-hidden="true" />}
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>

      {message && (
        <p className="max-w-sm text-xs text-slate-600 mb-6 leading-relaxed">
          {message}
        </p>
      )}

      <div className="flex items-center gap-3">
        {retryAction && (
          <Button
            variant="primary"
            size="sm"
            onClick={retryAction}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            {retryLabel}
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}

export default ErrorState;
