import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ActivityDay } from '../types';

export interface ActivityTrendProps {
  activity: ActivityDay[];
}

/**
 * Produce a local-time YYYY-MM-DD string for a given Date object.
 * Using local getFullYear/getMonth/getDate avoids UTC-shift issues where
 * toISOString() can roll back a day for timezones ahead of UTC.
 */
function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Build a canonical 7-entry array covering today and the 6 preceding days
 * (oldest to newest), then merge real API records into it.
 * Days absent from the API are represented as count=0: no fabrication,
 * absence of a record means no activity occurred on that date.
 */
function build7DayWindow(apiActivity: ActivityDay[]): ActivityDay[] {
  const apiByDate = new Map<string, ActivityDay>();
  for (const item of apiActivity) {
    if (item.date) {
      apiByDate.set(item.date, item);
    }
  }

  const result: ActivityDay[] = [];
  const today = new Date();

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const dateStr = toLocalDateString(d);

    if (apiByDate.has(dateStr)) {
      result.push(apiByDate.get(dateStr)!);
    } else {
      result.push({ date: dateStr, count: 0 });
    }
  }

  return result;
}

/**
 * Format a YYYY-MM-DD date string as a short weekday abbreviation (Mon, Tue...).
 * Appending T00:00:00 forces local-time parsing so the weekday matches the
 * user's calendar day rather than the UTC day.
 */
function getFormattedDay(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return dateStr.length > 5 ? dateStr.slice(5) : dateStr;
  }
}

export function ActivityTrend({ activity }: ActivityTrendProps) {
  // Always show the full 7-day window, padding absent days with count=0
  const windowedActivity = build7DayWindow(Array.isArray(activity) ? activity : []);

  if (windowedActivity.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Last 7 Days Activity</CardTitle>
          <CardDescription>Inspection throughput over the recent 7-day period</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <EmptyState
            title="No Activity Data"
            description="Inspection activity data for the last 7 days is currently unavailable."
          />
        </CardContent>
      </Card>
    );
  }

  const counts = windowedActivity.map((item) => Number(item.count ?? item.inspections ?? 0));
  const maxCount = Math.max(...counts, 1);

  return (
    <Card className="h-full flex flex-col border-slate-200 shadow-xs">
      <CardHeader className="py-4 px-6 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          7-Day Inspection Activity
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Inspection throughput over the recent 7-day observation period
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 flex-1 flex flex-col justify-between">
        {/* Bar Visualization with subtle guide lines */}
        <div className="relative h-44 w-full flex items-end justify-between gap-2 pt-6">
          <div className="absolute inset-x-0 top-6 border-b border-dashed border-slate-100 pointer-events-none" />
          <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 pointer-events-none" />

          {windowedActivity.map((item, index) => {
            const count = Number(item.count ?? item.inspections ?? 0);
            // Zero bars get a 4% stub height so the axis slot is always visible
            const heightPercent = count > 0 ? Math.max(Math.round((count / maxCount) * 100), 10) : 4;
            const shortLabel = item.day || getFormattedDay(item.date);

            return (
              <div
                key={item.date ?? index}
                className="flex-1 flex flex-col items-center justify-end h-full group relative z-10"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute -top-8 px-2 py-1 bg-slate-900 text-white text-[10px] font-medium rounded shadow-sm whitespace-nowrap z-20">
                  {count} inspection{count !== 1 ? 's' : ''} ({item.date})
                </div>

                {/* Bar: blue when activity exists, subtle slate stub for zero days */}
                <div
                  className={`w-full max-w-[36px] transition-all rounded-t-md cursor-pointer ${
                    count > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200/90 hover:bg-slate-300'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                  aria-label={`${item.date}: ${count} inspections`}
                />

                {/* Bottom Day label */}
                <span className="mt-2.5 text-[11px] font-semibold text-slate-600 truncate w-full text-center">
                  {shortLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend / Summary */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Fixed 7-Day Observation Window
          </span>
          <span className="font-semibold text-slate-800">
            Total: {counts.reduce((a, b) => a + b, 0)} Inspections
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default ActivityTrend;
