import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasAuthToken, getUserSession } from '@/lib/auth/token';
import { authService } from '../services/authService';
import type { UserSession } from '../types';

export interface UseAuthReturn {
  isAuthenticated: boolean;
  user: UserSession | null;
  role: string | null;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => hasAuthToken());
  const [user, setUser] = useState<UserSession | null>(() => getUserSession<UserSession>());

  const syncAuth = useCallback(() => {
    const authenticated = hasAuthToken();
    setIsAuthenticated(authenticated);
    setUser(authenticated ? getUserSession<UserSession>() : null);
  }, []);

  useEffect(() => {
    window.addEventListener('storage', syncAuth);
    window.addEventListener('auth-change', syncAuth);
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-change', syncAuth);
    };
  }, [syncAuth]);

  const logout = useCallback(async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Determine user role (normalized to lowercase). Default to 'inspector' if authenticated but role unassigned.
  const rawRole = user?.role || (user as unknown as { roles?: string[] })?.roles?.[0];
  const role = isAuthenticated ? (rawRole ? String(rawRole).toLowerCase() : 'inspector') : null;

  return {
    isAuthenticated,
    user,
    role,
    logout,
  };
}

export default useAuth;
