import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SidebarProps {
  brand?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  isCollapsed?: boolean;
  className?: string;
}

export function Sidebar({
  brand,
  children,
  footer,
  isCollapsed = false,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'h-screen sticky top-0 border-r border-slate-200 bg-white flex flex-col transition-all duration-200 z-40',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Brand / Logo Area */}
      {brand && (
        <div className="h-16 px-4 border-b border-slate-200 flex items-center shrink-0">
          {brand}
        </div>
      )}

      {/* Navigation Area */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {children}
      </nav>

      {/* Footer Area */}
      {footer && (
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 shrink-0">
          {footer}
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
