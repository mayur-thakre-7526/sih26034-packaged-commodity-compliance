import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type PageMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';

export interface PageContainerProps {
  title?: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  maxWidth?: PageMaxWidth;
  children: ReactNode;
  className?: string;
}

const maxWidthClasses: Record<PageMaxWidth, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  '7xl': 'max-w-(--breakpoint-2xl)',
  full: 'max-w-full',
};

export function PageContainer({
  title,
  description,
  breadcrumbs,
  actions,
  maxWidth = '7xl',
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8', maxWidthClasses[maxWidth], className)}>
      {/* Optional Breadcrumbs */}
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}

      {/* Page Header */}
      {(title || description || actions) && (
        <div className="mb-6 sm:mb-8 pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>

          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>
      )}

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}

export default PageContainer;
