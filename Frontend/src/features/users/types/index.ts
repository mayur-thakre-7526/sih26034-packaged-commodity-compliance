/**
 * Authorized system user role.
 * Strictly validated by backend to either 'inspector' or 'admin'.
 */
export type UserRole = 'inspector' | 'admin';

/**
 * System user entity returned by GET /api/users.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/**
 * Form payload for registering a new user via POST /api/users.
 */
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

/**
 * Payload for activating or deactivating a user via PATCH /api/users/:id/status.
 */
export interface UpdateUserStatusInput {
  is_active: boolean;
}
