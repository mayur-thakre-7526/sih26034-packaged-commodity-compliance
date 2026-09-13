import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

export interface MetricCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  subtext?: string;
  variant?: 'default' | 'primary' | 'success' | 'danger';
}

const variantStyles: Record<
  NonNullable<MetricCardProps['variant']>,
  { borderAccent: string; iconBg: string; iconColor: string; valueColor: string }
> = {
  default: {
    borderAccent: 'border-l-slate-400',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    valueColor: 'text-slate-900',
  },
  primary: {
    borderAccent: 'border-l-blue-600',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-700',
    valueColor: 'text-slate-900',
  },
  success: {
    borderAccent: 'border-l-emerald-600',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    valueColor: 'text-slate-900',
  },
  danger: {
    borderAccent: 'border-l-rose-600',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-700',
    valueColor: 'text-slate-900',
  },
};

export function MetricCard({
  label,
  value,
  icon,
  subtext,
  variant = 'default',
}: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn('hover:shadow-sm hover:border-slate-300 transition-all duration-150 border-l-4', styles.borderAccent)}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-2xs', styles.iconBg, styles.iconColor)}>
            {icon}
          </div>
        </div>

        <div className="mt-3">
          <p className={cn('text-2xl sm:text-3xl font-bold tracking-tight tabular-nums', styles.valueColor)}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricCard;
