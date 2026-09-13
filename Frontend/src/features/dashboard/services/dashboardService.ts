import apiClient from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { DashboardData } from '../types';
import type { ApiResponse } from '@/types/api';

/**
 * Service handling network requests for dashboard metrics and activity.
 */
export const dashboardService = {
  /**
   * Fetches the aggregated dashboard overview statistics from GET /api/dashboard.
   */
  async getDashboardData(): Promise<DashboardData> {
    const response = await apiClient.get<ApiResponse<DashboardData> | DashboardData>(
      ENDPOINTS.dashboard.base
    );

    const body = response.data;

    // Normalize wrapped ApiResponse envelope or flat JSON payload
    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as DashboardData;
    }

    return body as DashboardData;
  },
};

export default dashboardService;
