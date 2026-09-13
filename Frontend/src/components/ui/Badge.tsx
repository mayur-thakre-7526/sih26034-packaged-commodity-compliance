import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  leftIcon?: ReactNode;
}

const variantClasses: Record<BadgeVariant, { badge: string; dot: string }> = {
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dot: 'bg-slate-500',
  },
  primary: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dot: 'bg-blue-600',
  },
  success: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-600',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-600',
  },
  error: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-600',
  },
  info: {
    badge: 'bg-sky-50 text-sky-700 border-sky-200/80',
    dot: 'bg-sky-600',
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] font-semibold gap-1.5 rounded-full',
  md: 'px-2.5 py-0.5 text-xs font-semibold gap-1.5 rounded-full',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  leftIcon,
  className,
  children,
  ...props
}: BadgeProps) {
  const styles = variantClasses[variant];

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center border font-medium select-none',
        styles.badge,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', styles.dot)}
          aria-hidden="true"
        />
      )}
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
