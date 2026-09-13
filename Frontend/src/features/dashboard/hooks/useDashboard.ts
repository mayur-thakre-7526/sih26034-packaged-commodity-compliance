import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardData } from '../types';
import type { ApiError } from '@/types/api';

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await dashboardService.getDashboardData();
      setData(result);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.message ||
          'Failed to retrieve dashboard data. Please check network connectivity and backend server status.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initialFetch() {
      try {
        const result = await dashboardService.getDashboardData();
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const apiError = err as ApiError;
          setError(
            apiError.message ||
              'Failed to retrieve dashboard data. Please check network connectivity and backend server status.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initialFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  // Safe normalized field accessors
  const totalInspections =
    data?.totalInspections ??
    (data as Record<string, unknown> | null)?.['total_scans'] ??
    (data as Record<string, unknown> | null)?.['total_inspections'] ??
    0;

  const compliantInspections =
    data?.compliantInspections ??
    (data as Record<string, unknown> | null)?.['compliant_scans'] ??
    (data as Record<string, unknown> | null)?.['compliant_inspections'] ??
    0;

  const nonCompliantInspections =
    data?.nonCompliantInspections ??
    (data as Record<string, unknown> | null)?.['non_compliant_scans'] ??
    (data as Record<string, unknown> | null)?.['non_compliant_inspections'] ??
    0;

  const totalProducts =
    data?.totalProducts ?? (data as Record<string, unknown> | null)?.['total_products'] ?? 0;

  const criticalViolations =
    data?.criticalViolations ??
    data?.violations?.critical ??
    (data as Record<string, unknown> | null)?.['critical_violations'] ??
    0;

  const majorViolations =
    data?.majorViolations ??
    data?.violations?.major ??
    (data as Record<string, unknown> | null)?.['major_violations'] ??
    0;

  const minorViolations =
    data?.minorViolations ??
    data?.violations?.minor ??
    (data as Record<string, unknown> | null)?.['minor_violations'] ??
    0;

  const recentInspections =
    data?.recentInspections ??
    (data as Record<string, unknown> | null)?.['recent_scans'] ??
    (data as Record<string, unknown> | null)?.['recent_inspections'] ??
    [];

  const last7DaysActivity =
    data?.last7DaysActivity ??
    (data as Record<string, unknown> | null)?.['activity'] ??
    (data as Record<string, unknown> | null)?.['last_7_days_activity'] ??
    [];

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
    metrics: {
      totalInspections: Number(totalInspections),
      compliantInspections: Number(compliantInspections),
      nonCompliantInspections: Number(nonCompliantInspections),
      totalProducts: Number(totalProducts),
      criticalViolations: Number(criticalViolations),
      majorViolations: Number(majorViolations),
      minorViolations: Number(minorViolations),
      recentInspections: Array.isArray(recentInspections) ? recentInspections : [],
      last7DaysActivity: Array.isArray(last7DaysActivity) ? last7DaysActivity : [],
    },
  };
}

export default useDashboard;
