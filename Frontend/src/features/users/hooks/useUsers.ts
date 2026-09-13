import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../services/usersService';
import type { User } from '../types';
import type { ApiError } from '@/types/api';

/**
 * Hook for managing the user directory and activating/deactivating users.
 */
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await usersService.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.message ||
          'Failed to retrieve user accounts. Please verify your admin privileges and network connection.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearUpdateError = useCallback(() => {
    setUpdateError(null);
  }, []);

  const toggleUserStatus = useCallback(
    async (id: string, currentStatus: boolean): Promise<boolean> => {
      setUpdatingUserId(id);
      setUpdateError(null);

      try {
        const nextStatus = !currentStatus;
        const updated = await usersService.updateUserStatus(id, nextStatus);
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, is_active: updated.is_active } : u))
        );
        return true;
      } catch (err: unknown) {
        const apiError = err as ApiError;
        setUpdateError(
          apiError.message || 'Failed to update user status. Please try again.'
        );
        return false;
      } finally {
        setUpdatingUserId(null);
      }
    },
    []
  );

  useEffect(() => {
    let isCancelled = false;

    usersService
      .getUsers()
      .then((data) => {
        if (!isCancelled) {
          setUsers(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const apiError = err as ApiError;
          setError(
            apiError.message ||
              'Failed to retrieve user accounts. Please verify your admin privileges and network connection.'
          );
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    users,
    isLoading,
    error,
    updatingUserId,
    updateError,
    clearUpdateError,
    toggleUserStatus,
    refetch: fetchUsers,
  };
}

export default useUsers;
