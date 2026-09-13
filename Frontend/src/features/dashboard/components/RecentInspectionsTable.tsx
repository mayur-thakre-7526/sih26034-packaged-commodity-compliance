import { Link } from 'react-router-dom';
import { FileText, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { RecentInspection } from '../types';

export interface RecentInspectionsTableProps {
  inspections: RecentInspection[];
}

export function RecentInspectionsTable({ inspections }: RecentInspectionsTableProps) {
  if (!inspections || inspections.length === 0) {
    return (
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="py-4 px-6 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Recent Inspections
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Latest statutory compliance verification dossiers recorded in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <EmptyState
            title="No Recent Inspections"
            description="There are currently no statutory inspection records logged in the database."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-xs overflow-hidden">
      <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Recent Inspections
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Latest statutory compliance verification dossiers recorded in the system
          </CardDescription>
        </div>
        <Badge variant="neutral" size="sm">
          {inspections.length} Recent Records
        </Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
              <th scope="col" className="py-3 px-6">Inspection Dossier</th>
              <th scope="col" className="py-3 px-6">Regulated Commodity</th>
              <th scope="col" className="py-3 px-6">Screening Status</th>
              <th scope="col" className="py-3 px-6">Timestamp</th>
              <th scope="col" className="py-3 px-6 text-center">Violations</th>
              <th scope="col" className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {inspections.map((item, idx) => {
              const normOverall = ((item.overall_status as string) || '').toLowerCase();
              const normScan = ((item.status as string) || '').toLowerCase();

              let badgeVariant: 'success' | 'error' | 'info' | 'warning' = 'warning';
              let badgeText = 'Review Required';

              if (normScan === 'processing') {
                badgeVariant = 'info';
                badgeText = 'Processing';
              } else if (normScan === 'failed') {
                badgeVariant = 'error';
                badgeText = 'Failed';
              } else if (normOverall === 'compliant') {
                badgeVariant = 'success';
                badgeText = '✓ Compliant';
              } else if (normOverall === 'non_compliant') {
                badgeVariant = 'error';
                badgeText = '✕ Non-Compliant';
              }

              const rawDate = (item.created_at as string) || item.createdAt || item.date;
              let displayDate = '—';
              let displayTime = '';
              if (rawDate) {
                try {
                  const d = new Date(rawDate);
                  displayDate = d.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  displayTime = d.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                } catch {
                  displayDate = String(rawDate);
                }
              }

              const violations =
                item.violationsCount ??
                ((Number(item.critical) || 0) +
                  (Number(item.major) || 0) +
                  (Number(item.minor) || 0));

              const productName =
                (item.product_name as string) ||
                item.productName ||
                item.productCode ||
                'Standard Commodity';

              const secondaryInfo =
                (item.brand_name as string) ||
                (item.batchNumber ? `Batch: ${item.batchNumber}` : undefined);

              const idStr = String(item.id ?? '');
              const displayId = idStr.length > 8 ? `${idStr.slice(0, 8)}...` : idStr.padStart(5, '0');

              return (
                <tr key={item.id ?? idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6 font-mono text-xs font-semibold whitespace-nowrap">
                    <Link
                      to={`/inspections/${item.id}`}
                      className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 hover:underline focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded"
                      title={idStr}
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>#{displayId}</span>
                    </Link>
                  </td>
                  <td className="py-3.5 px-6">
                    <div className="max-w-xs sm:max-w-sm">
                      <p className="font-semibold text-slate-900 text-xs sm:text-sm leading-tight truncate" title={productName}>
                        {productName}
                      </p>
                      {secondaryInfo && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={secondaryInfo}>
                          {secondaryInfo}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-6 whitespace-nowrap">
                    <Badge variant={badgeVariant} size="sm" className="font-semibold tracking-wide">
                      {badgeText}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-6 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-800 font-medium">{displayDate}</span>
                      {displayTime && <span className="text-[11px] text-slate-400 font-mono">{displayTime}</span>}
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-center whitespace-nowrap">
                    {violations > 0 ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 min-w-[24px]">
                        {violations}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 min-w-[24px]">
                        0
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <Link
                      to={`/inspections/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-0.5"
                      aria-label={`View dossier for inspection ${item.id}`}
                    >
                      <span>View Dossier</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default RecentInspectionsTable;
