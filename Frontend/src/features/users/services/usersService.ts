import apiClient from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { User, CreateUserInput, UpdateUserStatusInput } from '../types';
import type { ApiResponse } from '@/types/api';

/**
 * Service handling user and inspector administration against SIH26034 backend.
 */
export const usersService = {
  /**
   * Fetches all registered users from GET /api/users.
   * Requires Admin authorization.
   */
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<User[]> | User[]>(
      ENDPOINTS.users.base
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && Array.isArray(body.data)) {
      return body.data as User[];
    }

    if (Array.isArray(body)) {
      return body;
    }

    return [];
  },

  /**
   * Creates a new user in Supabase Auth and the local users table.
   * Calls POST /api/users.
   * Requires Admin authorization.
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const response = await apiClient.post<ApiResponse<User> | User>(
      ENDPOINTS.users.base,
      input
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as User;
    }

    return body as User;
  },

  /**
   * Activates or deactivates a user account.
   * Calls PATCH /api/users/:id/status.
   * Requires Admin authorization.
   */
  async updateUserStatus(id: string, is_active: boolean): Promise<User> {
    const payload: UpdateUserStatusInput = { is_active };

    const response = await apiClient.patch<ApiResponse<User> | User>(
      ENDPOINTS.users.status(id),
      payload
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as User;
    }

    return body as User;
  },
};

export default usersService;
