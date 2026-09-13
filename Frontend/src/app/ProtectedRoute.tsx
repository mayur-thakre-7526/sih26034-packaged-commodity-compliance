import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface ProtectedRouteProps {
  allowedRoles?: string[];
  redirectPath?: string;
}

/**
 * Route guard that ensures the user is authenticated and possesses the required role.
 * Redirects unauthenticated visitors to /login and unauthorized roles to the application root.
 */
export function ProtectedRoute({
  allowedRoles,
  redirectPath = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  // 1. Authentication check: redirect to /login
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // 2. Role authorization check: redirect to / if user lacks permission
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = role ? role.toLowerCase() : '';
    const isAuthorized = allowedRoles.some(
      (allowed) => allowed.toLowerCase() === userRole
    );

    if (!isAuthorized) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
