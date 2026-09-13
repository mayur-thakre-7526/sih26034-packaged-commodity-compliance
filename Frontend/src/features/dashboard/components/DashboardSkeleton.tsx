import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard metrics">
      {/* KPI Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overview & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Skeleton */}
        <Card className="h-full">
          <CardHeader>
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-3 w-72" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex justify-end">
                <Skeleton className="h-3 w-24" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <Skeleton className="h-4 w-36" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="p-3 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-14" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Trend Skeleton */}
        <Card className="h-full">
          <CardHeader>
            <Skeleton className="h-5 w-44 mb-2" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent className="p-6 flex flex-col justify-between h-[calc(100%-80px)] space-y-6">
            <div className="h-44 flex items-end justify-between gap-2 pt-6">
              {[40, 65, 30, 85, 55, 90, 45].map((height, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                  <Skeleton
                    className="w-full max-w-[36px] rounded-t-md"
                    style={{ height: `${height}%` }}
                  />
                  <Skeleton className="h-3 w-8 mt-2" />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Inspections Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44 mb-2" />
          <Skeleton className="h-3 w-72" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            <div className="py-3 px-6 bg-slate-50 flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-4 px-6 flex justify-between items-center">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardSkeleton;
