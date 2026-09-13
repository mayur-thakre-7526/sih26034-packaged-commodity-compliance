import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function ProductsSkeleton() {
  return (
    <Card className="overflow-hidden shadow-xs border-slate-200" aria-busy="true" aria-label="Loading products">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <div className="divide-y divide-slate-100 min-w-[760px]">
          {/* Header Row */}
          <div className="py-3.5 px-6 bg-slate-50/75 flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Row Items */}
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="py-4 px-6 flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-20 font-mono" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProductsSkeleton;
