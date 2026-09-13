const AUTH_TOKEN_KEY = 'sih26034_auth_token';
const AUTH_USER_KEY = 'sih26034_auth_user';

/**
 * Retrieve the current authentication token from storage.
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist the authentication token to storage.
 */
export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }
  } catch (error) {
    console.error('Failed to save auth token:', error);
  }
}

/**
 * Remove the authentication token and associated user session from storage.
 */
export function removeAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }
  } catch (error) {
    console.error('Failed to remove auth token:', error);
  }
}

/**
 * Check whether an authentication token is present.
 */
export function hasAuthToken(): boolean {
  return Boolean(getAuthToken());
}

/**
 * Retrieve the current user session.
 * Checks stored user session object first, with fallback to parsing JWT claims if present.
 */
export function getUserSession<T = Record<string, unknown>>(): T | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      return JSON.parse(raw) as T;
    }

    // Fallback: extract claims if token is a standard JWT
    const token = getAuthToken();
    if (token && token.includes('.')) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(base64);
        return JSON.parse(decoded) as T;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Persist user session details to storage.
 */
export function setUserSession(user: unknown): void {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }
  } catch (error) {
    console.error('Failed to save user session:', error);
  }
}

/**
 * Remove user session details from storage.
 */
export function removeUserSession(): void {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }
  } catch (error) {
    console.error('Failed to remove user session:', error);
  }
}
