import { useState, useCallback } from 'react';
import { inspectionsService } from '../services/inspectionsService';
import type { CreateScanPayload, InspectionDetail } from '../types';
import type { ApiError } from '@/types/api';

/**
 * Hook for managing the submission of a new commodity compliance inspection scan.
 */
export function useCreateInspection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitScan = useCallback(async (payload: CreateScanPayload): Promise<InspectionDetail> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const createdScan = await inspectionsService.createScan(payload);
      return createdScan;
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const message =
        apiError.message || 'Failed to submit inspection scan. Please verify inputs and network connection.';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSubmitting,
    error,
    submitScan,
    clearError,
  };
}

export default useCreateInspection;
