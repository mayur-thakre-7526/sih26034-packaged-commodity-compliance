import { useState, useEffect } from 'react';
import { hasAuthToken } from '@/lib/auth/token';

/**
 * Hook to inspect local authentication token presence.
 * Synchronizes with browser storage changes.
 */
export function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => hasAuthToken());

  useEffect(() => {
    const handleStorage = () => {
      setIsAuthenticated(hasAuthToken());
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return { isAuthenticated };
}
