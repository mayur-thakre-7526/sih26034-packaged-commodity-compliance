import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, removeAuthToken } from '@/lib/auth/token';
import type { ApiError, BackendErrorPayload } from '@/types/api';

/**
 * Base URL configured from Vite environment variables.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Centralized Axios instance configured for SIH26034 API communications.
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor: Attach bearer token to outgoing requests when available.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

/**
 * Helper to identify generic technical Axios HTTP status messages.
 */
function isAxiosTechnicalMessage(message?: string): boolean {
  if (!message) return false;
  return /^Request failed with status code \d+$/i.test(message.trim());
}

/**
 * Extracts raw error message string from response data supporting:
 * - { error: string } (Express backend convention)
 * - { message: string } (Standard REST / Supabase convention)
 * - Plain string responses
 */
function extractRawServerMessage(data: unknown): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    const trimmed = data.trim();
    // Disregard HTML error documents (e.g. from proxies or web servers)
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return null;
    }
    return trimmed || null;
  }

  if (typeof data === 'object') {
    const payload = data as BackendErrorPayload;
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }
  }

  return null;
}

/**
 * Normalizes backend error strings and network failures into user-friendly messages and codes.
 */
function normalizeErrorMessage(
  rawMessage: string | null,
  status: number | undefined,
  axiosMessage?: string
): { message: string; code?: string } {
  // 1. Network / Connection failure
  if (!status) {
    return {
      message: 'Unable to connect to the server. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  // 2. Check for duplicate email across backend / Supabase Auth variants
  if (rawMessage) {
    const lower = rawMessage.toLowerCase();

    if (
      lower.includes('already been registered') ||
      lower.includes('already registered') ||
      lower.includes('email already exists') ||
      (lower.includes('user with this email') && lower.includes('already'))
    ) {
      return {
        message: 'A user with this email address already exists. Please use a different email.',
        code: 'EMAIL_ALREADY_EXISTS',
      };
    }

    // 3. Password constraints (e.g. Supabase "Password should be at least 6 characters")
    if (
      lower.includes('password') &&
      (lower.includes('at least') || lower.includes('short') || lower.includes('minimum'))
    ) {
      return {
        message: 'Password must be at least 6 characters long.',
        code: 'VALIDATION_ERROR',
      };
    }

    // 4. Preserve other meaningful backend error messages
    return {
      message: rawMessage,
    };
  }

  // 5. Fallback messages when no server error body exists (never expose raw Axios status codes)
  if (status === 400) {
    return { message: 'Invalid request. Please check the provided information and try again.', code: 'BAD_REQUEST' };
  }
  if (status === 401) {
    return { message: 'Session expired or unauthorized. Please sign in again.', code: 'UNAUTHORIZED' };
  }
  if (status === 403) {
    return { message: 'You do not have permission to perform this action.', code: 'FORBIDDEN' };
  }
  if (status === 404) {
    return { message: 'The requested resource was not found.', code: 'NOT_FOUND' };
  }
  if (status >= 500) {
    return { message: 'An unexpected server error occurred. Please try again later.', code: 'SERVER_ERROR' };
  }

  if (axiosMessage && !isAxiosTechnicalMessage(axiosMessage)) {
    return { message: axiosMessage };
  }

  return { message: 'An unexpected error occurred.', code: 'UNKNOWN_ERROR' };
}

/**
 * Response Interceptor: Global error formatting and authentication handling.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<BackendErrorPayload>) => {
    const status = error.response?.status;
    const serverData = error.response?.data;

    // Handle token expiry / unauthorized requests
    if (status === 401) {
      removeAuthToken();
    }

    const rawMessage = extractRawServerMessage(serverData);
    const normalized = normalizeErrorMessage(rawMessage, status, error.message);

    const formattedError: ApiError = {
      statusCode: status,
      code: serverData?.code || normalized.code || 'NETWORK_OR_SERVER_ERROR',
      message: normalized.message,
      details: serverData?.details,
    };

    return Promise.reject(formattedError);
  }
);

export default apiClient;

