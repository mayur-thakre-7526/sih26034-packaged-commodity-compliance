import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface HeaderProps {
  title?: ReactNode;
  subtitle?: string;
  jurisdiction?: ReactNode;
  leftElement?: ReactNode;
  actions?: ReactNode;
  user?: ReactNode;
  className?: string;
}

export function Header({
  title = 'SIH26034 Portal',
  subtitle,
  jurisdiction,
  leftElement,
  actions,
  user,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-4',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {leftElement && <div className="flex items-center shrink-0">{leftElement}</div>}

        <div className="min-w-0">
          {typeof title === 'string' ? (
            <div className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
              {title}
            </div>
          ) : (
            title
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 leading-tight">
              {subtitle}
            </p>
          )}
          {/* Mobile jurisdiction context */}
          <p className="md:hidden text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
            <span className="sm:hidden">Dept. of Consumer Affairs • Legal Metrology</span>
            <span className="hidden sm:inline">Department of Consumer Affairs • Legal Metrology Division</span>
          </p>
        </div>
      </div>

      {/* Desktop / Tablet statutory jurisdiction context */}
      {jurisdiction !== undefined ? (
        jurisdiction
      ) : (
        <div className="hidden md:flex flex-col items-end text-right shrink-0">
          <span className="text-xs font-medium text-slate-700 tracking-tight">
            Department of Consumer Affairs • Legal Metrology Division
          </span>
          <span className="text-[11px] text-slate-500 hidden lg:block tracking-tight">
            Ministry of Consumer Affairs, Food & Public Distribution
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        {user && <div className="flex items-center pl-2 sm:pl-3 border-l border-slate-200">{user}</div>}
      </div>
    </header>
  );
}

export default Header;
