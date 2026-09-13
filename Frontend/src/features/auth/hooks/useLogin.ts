import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken, setUserSession, removeAuthToken, removeUserSession } from '@/lib/auth/token';
import { authService } from '../services/authService';
import type { LoginCredentials, LoginFormErrors } from '../types';
import type { ApiError } from '@/types/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});

  const validate = useCallback((credentials: LoginCredentials): boolean => {
    const errors: LoginFormErrors = {};

    const trimmedEmail = credentials.email.trim();
    if (!trimmedEmail) {
      errors.email = 'Official email address is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!credentials.password) {
      errors.password = 'Password is required.';
    } else if (credentials.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setGeneralError(null);

      if (!validate(credentials)) {
        return false;
      }

      setIsLoading(true);

      try {
        const response = await authService.login({
          email: credentials.email.trim(),
          password: credentials.password,
        });

        // Extract session token supporting standard and Supabase formats
        const token =
          response.token ||
          response.accessToken ||
          response.session?.access_token ||
          ((response as Record<string, unknown>).access_token as string | undefined);

        if (token) {
          setAuthToken(token);
        }

        // Fetch application user profile with actual role and active status
        let user = response.user;
        if (token) {
          try {
            const me = await authService.getCurrentUser();
            if (me) {
              user = me;
            }
          } catch (meErr) {
            console.warn('Could not fetch user profile after login:', meErr);
          }
        }

        // Verify user account active status
        if (user) {
          if (user.is_active === false || user.status === 'inactive') {
            removeAuthToken();
            removeUserSession();
            setGeneralError(
              'Your account is currently inactive. Please contact the portal administrator for access.'
            );
            return false;
          }
          setUserSession(user);
        }

        // Navigate to the protected application area
        navigate('/', { replace: true });
        return true;
      } catch (err: unknown) {
        const apiError = err as ApiError;

        if (apiError.statusCode === 401 || apiError.statusCode === 403) {
          setGeneralError('Invalid email address or password. Please verify your credentials.');
        } else if (apiError.statusCode === 400 && apiError.message) {
          setGeneralError(apiError.message);
        } else {
          setGeneralError(
            apiError.message ||
              'Unable to establish a secure connection with the server. Please try again later.'
          );
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, validate]
  );

  const clearError = useCallback(() => {
    setGeneralError(null);
    setFieldErrors({});
  }, []);

  return {
    login,
    isLoading,
    generalError,
    fieldErrors,
    clearError,
  };
}

export default useLogin;
