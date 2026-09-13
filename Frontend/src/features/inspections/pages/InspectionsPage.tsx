import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ClipboardCheck, Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useInspections } from '../hooks/useInspections';
import { InspectionsFilter } from '../components/InspectionsFilter';
import { InspectionsTable } from '../components/InspectionsTable';
import { InspectionsSkeleton } from '../components/InspectionsSkeleton';
import { CreateInspectionModal } from '../components/CreateInspectionModal';

export function InspectionsPage() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const hasActiveFilters = Boolean(filters.search.trim() || filters.status);

  const handleViewDetails = (id: string) => {
    navigate(`/inspections/${id}`);
  };

  return (
    <PageContainer
      title="Quality Inspections"
      description="Legal Metrology (Packaged Commodities) compliance audit records, scan verifications, and regulatory verdicts"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Data
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Inspection
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Real-time Search and Filter Panel */}
        <InspectionsFilter
          search={filters.search}
          status={filters.status}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onReset={resetFilters}
          disabled={isLoading && inspections.length === 0}
        />

        {/* Loading State Skeleton */}
        {isLoading && inspections.length === 0 && <InspectionsSkeleton />}

        {/* Error State with Retry */}
        {error && inspections.length === 0 && (
          <ErrorState
            title="Unable to Load Inspection Records"
            message={error}
            retryAction={refetch}
            retryLabel="Retry Connection"
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && inspections.length === 0 && (
          <EmptyState
            title={hasActiveFilters ? 'No Matching Inspections' : 'No Inspections Recorded'}
            description={
              hasActiveFilters
                ? 'No inspection records match the current filter criteria. Try adjusting your search term or status filter.'
                : 'There are currently no commodity inspection records logged in the compliance database.'
            }
            icon={<ClipboardCheck className="h-6 w-6 text-slate-400" />}
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Start First Inspection
                </Button>
              )
            }
          />
        )}

        {/* Populated Live Inspections Table */}
        {inspections.length > 0 && (
          <InspectionsTable
            inspections={inspections}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>

      {/* Start / Create New Inspection Modal */}
      <CreateInspectionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(createdScan) => {
          setIsCreateOpen(false);
          refetch();
          navigate(`/inspections/${createdScan.id}`);
        }}
      />
    </PageContainer>
  );
}

export default InspectionsPage;
