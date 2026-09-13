import apiClient from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { removeAuthToken, removeUserSession } from '@/lib/auth/token';
import type { LoginCredentials, AuthResponse, UserSession } from '../types';
import type { ApiResponse } from '@/types/api';

/**
 * Service handling all authentication-related network calls.
 * Decoupled from React UI layer.
 */
export const authService = {
  /**
   * Submits user login credentials to the authentication endpoint.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse> | AuthResponse>(
      ENDPOINTS.auth.login,
      credentials
    );

    const body = response.data;

    // Normalize both standard envelope { success: true, data: { ... } } and flat payloads
    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as AuthResponse;
    }

    return body as AuthResponse;
  },

  /**
   * Fetches the current user profile from GET /api/auth/me.
   */
  async getCurrentUser(): Promise<UserSession> {
    const response = await apiClient.get<ApiResponse<UserSession> | UserSession>(
      ENDPOINTS.auth.me
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as UserSession;
    }

    return body as UserSession;
  },

  /**
   * Logs out the current user, notifying the backend and clearing local session storage.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(ENDPOINTS.auth.logout);
    } catch (error) {
      console.warn('Backend logout notification failed, clearing local session:', error);
    } finally {
      removeAuthToken();
      removeUserSession();
    }
  },
};

export default authService;
