/**
 * Centralized API endpoints registry to enforce DRY URLs across all features.
 */
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    me: '/auth/me',
    refreshToken: '/auth/refresh',
  },
  dashboard: {
    base: '/dashboard',
    metrics: '/dashboard/metrics',
    summary: '/dashboard/summary',
  },
  inspections: {
    base: '/scans',
    byId: (id: string | number) => `/scans/${id}`,
    report: (id: string | number) => `/scans/${id}/report`,
  },
  products: {
    base: '/products',
    byId: (id: string | number) => `/products/${id}`,
  },
  reports: {
    base: '/scans',
    byId: (id: string | number) => `/scans/${id}`,
    pdf: (id: string | number) => `/scans/${id}/report`,
  },
  users: {
    base: '/users',
    byId: (id: string | number) => `/users/${id}`,
    status: (id: string | number) => `/users/${id}/status`,
    profile: '/users/profile',
  },
} as const;
