import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardCheck,
  Package,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  roles?: string[]; // Allowed roles (if omitted, accessible to all authenticated roles)
}

const NAVIGATION_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: 'Inspections',
    to: '/inspections',
    icon: <ClipboardCheck className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: 'Products',
    to: '/products',
    icon: <Package className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: <FileText className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: 'Users',
    to: '/users',
    icon: <Users className="h-4 w-4" aria-hidden="true" />,
    roles: ['admin'], // Restricted strictly to admin
  },
];

export function AppLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, role, logout } = useAuth();
  const location = useLocation();

  // Filter navigation items based on resolved user role
  const visibleNavItems = NAVIGATION_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return role ? item.roles.includes(role.toLowerCase()) : false;
  });

  const renderNavLinks = () => (
    <div className="space-y-1">
      {visibleNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={() => setIsMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 select-none border-l-3',
              isActive
                ? 'bg-blue-50 text-blue-700 font-semibold border-l-blue-700 shadow-2xs'
                : 'text-slate-600 border-l-transparent hover:bg-slate-50 hover:text-slate-900'
            )
          }
        >
          <span className="shrink-0">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );

  const renderBrand = () => (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-xs shrink-0">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="leading-tight">
        <span className="text-xs font-bold text-slate-900 tracking-tight block">
          SIH26034
        </span>
        <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
          Legal Metrology Portal
        </span>
      </div>
    </div>
  );

  const renderFooter = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 px-1">
        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold shrink-0">
          <UserIcon className="h-4 w-4 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {user?.name || user?.email || 'Authenticated User'}
          </p>
          <Badge
            variant={role === 'admin' ? 'primary' : 'neutral'}
            size="sm"
            className="text-[10px] mt-0.5"
          >
            {role ? role.toUpperCase() : 'INSPECTOR'}
          </Badge>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => logout()}
        className="w-full justify-start text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        leftIcon={<LogOut className="h-4 w-4" />}
      >
        Sign Out
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar brand={renderBrand()} footer={renderFooter()}>
          {renderNavLinks()}
        </Sidebar>
      </div>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-64 max-w-[80vw] h-full bg-white shadow-xl animate-in slide-in-from-left duration-200">
            <div className="absolute right-2 top-3">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar brand={renderBrand()} footer={renderFooter()}>
              {renderNavLinks()}
            </Sidebar>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="SIH26034 Portal"
          subtitle="Legal Metrology & Quality Compliance System"
          leftElement={
            <button
              type="button"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-700 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          }
          user={
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-700">
              <span className="truncate max-w-[150px]">{user?.name || user?.email || 'User'}</span>
              <Badge
                variant={role === 'admin' ? 'primary' : 'neutral'}
                size="sm"
                className="uppercase"
              >
                {role || 'INSPECTOR'}
              </Badge>
            </div>
          }
        />

        <main id="main-content" className="flex-1 overflow-y-auto" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
