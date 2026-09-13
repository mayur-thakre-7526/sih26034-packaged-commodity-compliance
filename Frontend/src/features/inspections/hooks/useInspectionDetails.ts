import { useState, useCallback } from 'react';
import { inspectionsService } from '../services/inspectionsService';
import type { InspectionDetail } from '../types';
import type { ApiError } from '@/types/api';

/**
 * Hook for managing single inspection details and PDF report download.
 */
export function useInspectionDetails() {
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fetchInspection = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await inspectionsService.getInspectionById(id);
      setInspection(data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to retrieve inspection details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadReport = useCallback(async (id: string) => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const blob = await inspectionsService.downloadInspectionReport(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-report-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setDownloadError(apiError.message || 'Failed to download compliance report.');
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const clearInspection = useCallback(() => {
    setInspection(null);
    setError(null);
    setDownloadError(null);
  }, []);

  return {
    inspection,
    isLoading,
    error,
    isDownloading,
    downloadError,
    fetchInspection,
    downloadReport,
    clearInspection,
  };
}

export default useInspectionDetails;
