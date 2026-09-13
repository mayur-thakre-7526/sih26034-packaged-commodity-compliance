export * from './api';

/**
 * Common ID type used across entities.
 */
export type EntityId = string | number;

/**
 * Common status types.
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
