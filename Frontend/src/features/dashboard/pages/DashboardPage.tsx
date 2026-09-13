import { RefreshCw, ClipboardCheck, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { useDashboard } from '../hooks/useDashboard';
import { MetricCard } from '../components/MetricCard';
import { ComplianceOverview } from '../components/ComplianceOverview';
import { ActivityTrend } from '../components/ActivityTrend';
import { RecentInspectionsTable } from '../components/RecentInspectionsTable';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

export function DashboardPage() {
  const { data, isLoading, error, refetch, metrics } = useDashboard();

  return (
    <PageContainer
      title="Dashboard"
      description="Centralized monitoring of AI-assisted packaged commodity compliance inspections."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          isLoading={isLoading}
          leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          aria-label="Refresh dashboard metrics"
        >
          Refresh Data
        </Button>
      }
    >
      {/* Loading state before initial data */}
      {isLoading && !data && <DashboardSkeleton />}

      {/* Error state if request fails and no cached data */}
      {error && !data && (
        <ErrorState
          title="Unable to Load Dashboard"
          message={error}
          retryAction={refetch}
          retryLabel="Retry Connection"
        />
      )}

      {/* Populated Dashboard Content */}
      {data && (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Inspections"
              value={metrics.totalInspections}
              icon={<ClipboardCheck className="h-5 w-5" />}
              subtext="All evaluated statutory scans"
              variant="primary"
            />
            <MetricCard
              label="Compliant Inspections"
              value={metrics.compliantInspections}
              icon={<CheckCircle2 className="h-5 w-5" />}
              subtext="Zero statutory violations"
              variant="success"
            />
            <MetricCard
              label="Non-Compliant Inspections"
              value={metrics.nonCompliantInspections}
              icon={<AlertTriangle className="h-5 w-5" />}
              subtext="Flagged for officer review"
              variant="danger"
            />
            <MetricCard
              label="Total Products"
              value={metrics.totalProducts}
              icon={<Package className="h-5 w-5" />}
              subtext="Registered commodity catalog"
              variant="default"
            />
          </div>

          {/* Compliance & Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComplianceOverview
              compliantCount={metrics.compliantInspections}
              nonCompliantCount={metrics.nonCompliantInspections}
              criticalViolations={metrics.criticalViolations}
              majorViolations={metrics.majorViolations}
              minorViolations={metrics.minorViolations}
            />
            <ActivityTrend activity={metrics.last7DaysActivity} />
          </div>

          {/* Recent Inspections Table */}
          <RecentInspectionsTable inspections={metrics.recentInspections} />
        </div>
      )}
    </PageContainer>
  );
}

export default DashboardPage;
