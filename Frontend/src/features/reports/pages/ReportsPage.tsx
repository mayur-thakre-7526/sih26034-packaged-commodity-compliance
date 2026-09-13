import { useState } from 'react';
import { RefreshCw, FileText } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useInspections,
  useInspectionDetails,
  InspectionsFilter,
  InspectionsSkeleton,
  InspectionDetailsModal,
} from '@/features/inspections';
import { ReportsTable } from '../components/ReportsTable';

export function ReportsPage() {
  const {
    inspections,
    isLoading,
    error,
    filters,
    setSearch,
    setStatus,
    resetFilters,
    refetch,
  } = useInspections();

  const { downloadReport, downloadError, clearInspection } = useInspectionDetails();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const hasActiveFilters = Boolean(filters.search.trim() || filters.status);

  const handleViewDetails = (id: string) => {
    setSelectedReportId(id);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedReportId(null);
  };

  const handleDownloadPdf = async (id: string) => {
    setDownloadingId(id);
    try {
      await downloadReport(id);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <PageContainer
      title="Compliance Reports"
      description="Official Legal Metrology compliance audit reports, statutory verification records, and downloadable certificate archives"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          isLoading={isLoading}
          leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          aria-label="Refresh compliance reports list"
        >
          Refresh Reports
        </Button>
      }
    >
      <div className="space-y-6">
        {/* PDF Download Error Banner */}
        {downloadError && (
          <ErrorState
            compact
            title="Unable to Generate or Download PDF Report"
            message={downloadError}
            retryAction={clearInspection}
            retryLabel="Dismiss"
          />
        )}

        {/* Reused Search & Status Filter Panel */}
        <InspectionsFilter
          search={filters.search}
          status={filters.status}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onReset={resetFilters}
          disabled={isLoading && inspections.length === 0}
        />

        {/* Loading Skeleton */}
        {isLoading && inspections.length === 0 && <InspectionsSkeleton />}

        {/* Error State with Retry */}
        {error && inspections.length === 0 && (
          <ErrorState
            title="Unable to Load Compliance Reports"
            message={error}
            retryAction={refetch}
            retryLabel="Retry Connection"
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && inspections.length === 0 && (
          <EmptyState
            title={hasActiveFilters ? 'No Matching Reports' : 'No Reports Available'}
            description={
              hasActiveFilters
                ? 'No compliance inspection reports match your search criteria. Try modifying your filter values.'
                : 'There are currently no inspection verification reports archived in the database.'
            }
            icon={<FileText className="h-6 w-6 text-slate-400" />}
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Populated Reports Table */}
        {inspections.length > 0 && (
          <ReportsTable
            reports={inspections}
            onViewDetails={handleViewDetails}
            onDownloadPdf={handleDownloadPdf}
            downloadingId={downloadingId}
          />
        )}
      </div>

      {/* Reused Full Audit Details Modal */}
      <InspectionDetailsModal
        isOpen={isDetailsOpen}
        inspectionId={selectedReportId}
        onClose={handleCloseDetails}
      />
    </PageContainer>
  );
}

export default ReportsPage;
