/**
 * Standard API response envelope.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

/**
 * Pagination metadata for collection responses.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Standard paginated API response envelope.
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Raw error payload structure returned from backend APIs.
 * Supports both { error: string } and { message: string } formats.
 */
export interface BackendErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * Structured API error response format.
 */
export interface ApiError {
  code?: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}

