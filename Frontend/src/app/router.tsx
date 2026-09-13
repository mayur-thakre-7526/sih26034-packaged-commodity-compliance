import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardPage } from '@/features/dashboard';
import { InspectionsPage, InspectionDetailsPage } from '@/features/inspections';
import { ProductsPage } from '@/features/products';
import { ReportsPage } from '@/features/reports';
import { UsersPage } from '@/features/users';

/**
 * Centralized application route definitions for SIH26034.
 * Defines public routes and role-protected application areas.
 */
export const router = createBrowserRouter([
  // Public Route (outside authenticated layout)
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Authenticated Shell (protected by auth session)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <DashboardPage />,
          },
          {
            path: '/inspections',
            element: <InspectionsPage />,
          },
          {
            path: '/inspections/:id',
            element: <InspectionDetailsPage />,
          },
          {
            path: '/products',
            element: <ProductsPage />,
          },
          {
            path: '/reports',
            element: <ReportsPage />,
          },

          // Admin-only Route Guard
          {
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              {
                path: '/users',
                element: <UsersPage />,
              },
            ],
          },
        ],
      },
    ],
  },

  // Fallback redirection
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
