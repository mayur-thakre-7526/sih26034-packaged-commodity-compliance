import { RouterProvider } from 'react-router-dom';
import { router } from './router';

/**
 * Application providers wrapper.
 * Houses RouterProvider and future context / state management providers.
 */
export function AppProviders() {
  return <RouterProvider router={router} />;
}

export default AppProviders;
