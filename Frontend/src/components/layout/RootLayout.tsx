import { Outlet } from 'react-router-dom';

/**
 * Root application layout shell providing the React Router outlet.
 * Feature screens and views are rendered inside the Outlet.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;
