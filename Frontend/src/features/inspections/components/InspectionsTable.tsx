import { useState, useMemo } from 'react';
import {
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { InspectionListItem } from '../types';
import { getScreeningResultBadge } from '../utils/complianceNormalizer';

export interface InspectionsTableProps {
  inspections: InspectionListItem[];
  onViewDetails: (id: string) => void;
}

const PAGE_SIZE = 10;

function formatInspectionDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function InspectionsTable({ inspections, onViewDetails }: InspectionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Automatically reset to page 1 whenever the dataset reference changes (e.g. search, filter, clear)
  const [prevInspections, setPrevInspections] = useState(inspections);
  if (inspections !== prevInspections) {
    setPrevInspections(inspections);
    setCurrentPage(1);
  }

  const totalRecords = inspections.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRecords);

  const currentRecords = useMemo(
    () => inspections.slice(startIndex, endIndex),
    [inspections, startIndex, endIndex]
  );

  const rangeText =
    totalRecords === 0
      ? 'Showing 0 of 0 inspections'
      : startIndex + 1 === endIndex
      ? `Showing ${startIndex + 1} of ${totalRecords} ${
          totalRecords === 1 ? 'inspection' : 'inspections'
        }`
      : `Showing ${startIndex + 1}–${endIndex} of ${totalRecords} inspections`;

  return (
    <Card className="overflow-hidden shadow-xs border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Inspection Verification Logs
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Legal Metrology compliance records, automated scanner verdicts, and audit timestamps
          </CardDescription>
        </div>
        <Badge variant="neutral" size="sm">
          {totalRecords} {totalRecords === 1 ? 'Record' : 'Records'}
        </Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-6">Inspection ID</th>
              <th scope="col" className="py-3.5 px-6">Commodity & Brand</th>
              <th scope="col" className="py-3.5 px-6">Screening Result</th>
              <th scope="col" className="py-3.5 px-6">Inspection Date</th>
              <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {currentRecords.map((item) => {
              const screeningResult = getScreeningResultBadge(item.overall_status, item.status);
              const formattedDate = formatInspectionDate(item.created_at);
              const shortId = item.id.length > 8 ? `${item.id.slice(0, 8)}...` : item.id;
              const hasSeverity =
                (item.critical !== undefined && item.critical > 0) ||
                (item.major !== undefined && item.major > 0) ||
                (item.minor !== undefined && item.minor > 0);

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Inspection ID */}
                  <td className="py-3.5 px-6 font-mono text-xs font-semibold text-blue-700">
                    <span title={item.id}>#{shortId}</span>
                  </td>

                  {/* Product & Brand */}
                  <td className="py-3.5 px-6">
                    <div className="max-w-xs sm:max-w-sm">
                      <p
                        className="font-semibold text-slate-900 leading-tight truncate"
                        title={item.product_name || 'Unspecified Commodity'}
                      >
                        {item.product_name || 'Unspecified Commodity'}
                      </p>
                      {item.brand_name && (
                        <p
                          className="text-xs text-slate-500 mt-0.5 font-medium truncate"
                          title={item.brand_name}
                        >
                          Brand: <span className="text-slate-700">{item.brand_name}</span>
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Consolidated Screening Result */}
                  <td className="py-3.5 px-6 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge
                        variant={screeningResult.variant}
                        dot
                        size="sm"
                        className="font-semibold tracking-wide"
                      >
                        {screeningResult.label}
                      </Badge>
                      {hasSeverity && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          {item.critical !== undefined && item.critical > 0 && (
                            <span className="text-rose-600 font-semibold">{item.critical} Critical</span>
                          )}
                          {item.major !== undefined && item.major > 0 && (
                            <span className="text-amber-600 font-semibold">{item.major} Major</span>
                          )}
                          {item.minor !== undefined && item.minor > 0 && (
                            <span className="text-blue-600 font-semibold">{item.minor} Minor</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Created Date */}
                  <td className="py-3.5 px-6 text-xs text-slate-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{formattedDate}</span>
                    </span>
                  </td>

                  {/* View Details Action */}
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(item.id)}
                      className="border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 shadow-2xs"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      aria-label={`View details for inspection #${shortId}`}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>

      {/* Pagination Controls Footer */}
      {totalRecords > 0 && (
        <div className="border-t border-slate-200/90 bg-slate-50/50 py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-600 font-medium">
            {rangeText}
          </p>

          <nav aria-label="Inspections table pagination" className="flex items-center gap-1.5 flex-wrap justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              leftIcon={<ChevronsLeft className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to first page"
            >
              First
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to previous page"
            >
              Previous
            </Button>

            <span className="text-xs text-slate-700 font-medium px-2">
              Page <span className="font-bold text-slate-900">{safeCurrentPage}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to next page"
            >
              Next
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              rightIcon={<ChevronsRight className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to last page"
            >
              Last
            </Button>
          </nav>
        </div>
      )}
    </Card>
  );
}

export default InspectionsTable;
