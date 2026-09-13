import apiClient from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { InspectionListItem, InspectionDetail, InspectionFilters, CreateScanPayload } from '../types';
import type { ApiResponse } from '@/types/api';

/**
 * Service for managing quality inspection requests against the SIH26034 backend.
 */
export const inspectionsService = {
  /**
   * Initiates a new package compliance scan with evidence images.
   * Calls POST /api/scans with multipart/form-data.
   */
  async createScan(payload: CreateScanPayload): Promise<InspectionDetail> {
    const formData = new FormData();
    formData.append('product_id', payload.product_id);
    for (const image of payload.images) {
      formData.append('images', image);
    }

    const response = await apiClient.post<ApiResponse<InspectionDetail> | InspectionDetail>(
      ENDPOINTS.inspections.base,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 240000,
      }
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as InspectionDetail;
    }

    return body as InspectionDetail;
  },

  /**
   * Fetches the list of inspections with optional search and status filtering.
   * Calls GET /api/scans?search=...&status=...
   */
  async getInspections(filters?: InspectionFilters): Promise<InspectionListItem[]> {
    const params: Record<string, string> = {};

    if (filters?.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    if (filters?.status && (filters.status === 'compliant' || filters.status === 'non_compliant')) {
      params.status = filters.status;
    }

    const response = await apiClient.get<ApiResponse<InspectionListItem[]> | InspectionListItem[]>(
      ENDPOINTS.inspections.base,
      { params }
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && Array.isArray(body.data)) {
      return body.data as InspectionListItem[];
    }

    if (Array.isArray(body)) {
      return body;
    }

    return [];
  },

  /**
   * Fetches full inspection details by scan ID.
   * Calls GET /api/scans/:id
   */
  async getInspectionById(id: string): Promise<InspectionDetail> {
    const response = await apiClient.get<ApiResponse<InspectionDetail> | InspectionDetail>(
      ENDPOINTS.inspections.byId(id)
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as InspectionDetail;
    }

    return body as InspectionDetail;
  },

  /**
   * Downloads the generated legal compliance report PDF.
   * Calls GET /api/scans/:id/report
   */
  async downloadInspectionReport(id: string): Promise<Blob> {
    const response = await apiClient.get(ENDPOINTS.inspections.report(id), {
      responseType: 'blob',
    });

    return response.data as Blob;
  },
};

export default inspectionsService;
