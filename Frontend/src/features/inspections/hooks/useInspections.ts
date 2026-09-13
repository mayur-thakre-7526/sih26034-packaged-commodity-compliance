import { useState, useEffect, useCallback, useRef } from 'react';
import { inspectionsService } from '../services/inspectionsService';
import type { InspectionListItem, InspectionFilters } from '../types';
import type { ApiError } from '@/types/api';

/**
 * Hook for managing the inspections list with search and status filtering.
 */
export function useInspections(initialFilters?: InspectionFilters) {
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(initialFilters?.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters?.search || '');
  const [statusFilter, setStatusFilter] = useState<InspectionFilters['status']>(
    initialFilters?.status || ''
  );

  // Debounce search input changes by 350ms
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 350);
  }, []);

  const handleStatusChange = useCallback((value: InspectionFilters['status']) => {
    setStatusFilter(value);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
  }, []);

  const fetchInspections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await inspectionsService.getInspections({
        search: debouncedSearch,
        status: statusFilter,
      });
      setInspections(data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.message ||
          'Failed to retrieve inspections. Please check network connectivity and backend server status.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    let isCancelled = false;

    inspectionsService
      .getInspections({
        search: debouncedSearch,
        status: statusFilter,
      })
      .then((data) => {
        if (!isCancelled) {
          setInspections(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const apiError = err as ApiError;
          setError(
            apiError.message ||
              'Failed to retrieve inspections. Please check network connectivity and backend server status.'
          );
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    inspections,
    isLoading,
    error,
    filters: {
      search: searchInput,
      debouncedSearch,
      status: statusFilter,
    },
    setSearch: handleSearchChange,
    setStatus: handleStatusChange,
    resetFilters: handleResetFilters,
    refetch: fetchInspections,
  };
}

export default useInspections;
