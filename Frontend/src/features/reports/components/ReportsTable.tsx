import { useState, useMemo } from 'react';
import {
  Eye,
  FileDown,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import type { ReportItem } from '../types';
import { getComplianceBadgeVariant } from '@/features/inspections';

export interface ReportsTableProps {
  reports: ReportItem[];
  onViewDetails: (id: string) => void;
  onDownloadPdf: (id: string) => void;
  downloadingId: string | null;
}

const PAGE_SIZE = 10;

function formatReportDate(dateStr: string): string {
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

export function ReportsTable({
  reports,
  onViewDetails,
  onDownloadPdf,
  downloadingId,
}: ReportsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Automatically reset to page 1 whenever the dataset reference changes (e.g. search, filter, clear)
  const [prevReports, setPrevReports] = useState(reports);
  if (reports !== prevReports) {
    setPrevReports(reports);
    setCurrentPage(1);
  }

  const totalRecords = reports.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRecords);

  const currentRecords = useMemo(
    () => reports.slice(startIndex, endIndex),
    [reports, startIndex, endIndex]
  );

  const rangeText =
    totalRecords === 0
      ? 'Showing 0 of 0 reports'
      : startIndex + 1 === endIndex
      ? `Showing ${startIndex + 1} of ${totalRecords} ${
          totalRecords === 1 ? 'report' : 'reports'
        }`
      : `Showing ${startIndex + 1}–${endIndex} of ${totalRecords} reports`;

  return (
    <Card className="overflow-hidden shadow-xs border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Compliance Inspection Reports
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Official statutory audit reports, violation findings, and downloadable certificate archives
          </CardDescription>
        </div>
        <Badge variant="neutral" size="sm">
          {totalRecords} {totalRecords === 1 ? 'Report' : 'Reports'}
        </Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-6">Report ID</th>
              <th scope="col" className="py-3.5 px-6">Commodity & Brand</th>
              <th scope="col" className="py-3.5 px-6">Audit Status</th>
              <th scope="col" className="py-3.5 px-6">Inspection Date</th>
              <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {currentRecords.map((item) => {
              const complianceInfo = getComplianceBadgeVariant(item.overall_status, item.status);
              const isCompleted = item.status?.toLowerCase() === 'completed';
              const formattedDate = formatReportDate(item.created_at);
              const shortId = item.id.length > 8 ? `${item.id.slice(0, 8)}...` : item.id;
              const isCurrentDownloading = downloadingId === item.id;
              const isAnyDownloading = downloadingId !== null;

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Report / Inspection ID */}
                  <td className="py-3.5 px-6 font-mono text-xs font-semibold text-blue-700">
                    <span className="inline-flex items-center gap-1.5" title={item.id}>
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      #{shortId}
                    </span>
                  </td>

                  {/* Commodity & Brand */}
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

                  {/* Compliance Audit Status */}
                  <td className="py-3.5 px-6">
                    <Badge variant={complianceInfo.variant} dot size="sm">
                      {complianceInfo.label}
                    </Badge>
                  </td>

                  {/* Inspection Date */}
                  <td className="py-3.5 px-6 text-xs text-slate-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{formattedDate}</span>
                    </span>
                  </td>

                  {/* Actions: View Audit + Download PDF */}
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(item.id)}
                        className="border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 shadow-2xs"
                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                        aria-label={`View audit findings for report #${shortId}`}
                      >
                        View Audit
                      </Button>

                      <Button
                        type="button"
                        variant={isCompleted ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => onDownloadPdf(item.id)}
                        disabled={!isCompleted || (isAnyDownloading && !isCurrentDownloading)}
                        isLoading={isCurrentDownloading}
                        className={cn(
                          !isCompleted && 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed'
                        )}
                        aria-label={
                          isCurrentDownloading
                            ? `Downloading compliance PDF report for #${shortId}`
                            : `Download official Legal Metrology compliance PDF certificate for #${shortId}`
                        }
                        title={
                          isCurrentDownloading
                            ? 'Downloading PDF certificate...'
                            : isAnyDownloading
                            ? 'Another report download is in progress'
                            : isCompleted
                            ? 'Download official Legal Metrology compliance PDF certificate'
                            : item.status?.toLowerCase() === 'processing'
                            ? 'PDF certificate is generated once scan audit is completed'
                            : 'PDF certificate is unavailable for failed scan audits'
                        }
                        leftIcon={<FileDown className="h-3.5 w-3.5" />}
                      >
                        {isCurrentDownloading ? 'Downloading...' : 'Download PDF'}
                      </Button>
                    </div>
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

          <nav aria-label="Reports table pagination" className="flex items-center gap-1.5 flex-wrap justify-center">
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

export default ReportsTable;
