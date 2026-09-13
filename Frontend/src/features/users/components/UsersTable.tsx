import { useState, useMemo } from 'react';
import {
  UserCheck,
  UserX,
  Shield,
  User as UserIcon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { User } from '../types';

export interface UsersTableProps {
  users: User[];
  onToggleStatus: (user: User) => void;
  updatingUserId: string | null;
}

const PAGE_SIZE = 10;

function formatUserDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function UsersTable({
  users,
  onToggleStatus,
  updatingUserId,
}: UsersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Automatically reset to page 1 whenever the dataset reference changes
  const [prevUsers, setPrevUsers] = useState(users);
  if (users !== prevUsers) {
    setPrevUsers(users);
    setCurrentPage(1);
  }

  const totalRecords = users.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRecords);

  const currentRecords = useMemo(
    () => users.slice(startIndex, endIndex),
    [users, startIndex, endIndex]
  );

  const rangeText =
    totalRecords === 0
      ? 'Showing 0 of 0 users'
      : startIndex + 1 === endIndex
      ? `Showing ${startIndex + 1} of ${totalRecords} ${
          totalRecords === 1 ? 'user' : 'users'
        }`
      : `Showing ${startIndex + 1}–${endIndex} of ${totalRecords} users`;

  return (
    <Card className="overflow-hidden shadow-xs border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Authorized Personnel Directory
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Registered Legal Metrology inspectors, administrative officers, and access privileges
          </CardDescription>
        </div>
        <Badge variant="neutral" size="sm">
          {totalRecords} {totalRecords === 1 ? 'User' : 'Users'}
        </Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-6">Official Name</th>
              <th scope="col" className="py-3.5 px-6">Email Address</th>
              <th scope="col" className="py-3.5 px-6">Assigned Role</th>
              <th scope="col" className="py-3.5 px-6">Account Status</th>
              <th scope="col" className="py-3.5 px-6">Registered On</th>
              <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {currentRecords.map((item) => {
              const isCurrentUpdating = updatingUserId === item.id;
              const formattedDate = formatUserDate(item.created_at);
              const initial = item.name ? item.name.charAt(0).toUpperCase() : 'U';
              const shortId = item.id.length > 8 ? `${item.id.slice(0, 8)}...` : item.id;

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Name & Initial */}
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0"
                        aria-hidden="true"
                      >
                        {initial}
                      </div>
                      <div className="max-w-xs">
                        <p
                          className="font-semibold text-slate-900 leading-tight truncate"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <p
                          className="text-[11px] font-mono text-slate-400 mt-0.5 truncate"
                          title={item.id}
                        >
                          ID: {shortId}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-6 font-mono text-xs text-slate-700">
                    <span className="max-w-xs truncate block" title={item.email}>
                      {item.email}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-6">
                    <Badge
                      variant={item.role === 'admin' ? 'primary' : 'info'}
                      size="sm"
                      className="text-[11px] font-semibold"
                      leftIcon={
                        item.role === 'admin' ? (
                          <Shield className="h-3 w-3 text-blue-700" aria-hidden="true" />
                        ) : (
                          <UserIcon className="h-3 w-3 text-sky-700" aria-hidden="true" />
                        )
                      }
                    >
                      {item.role === 'admin' ? 'Admin' : 'Inspector'}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-6">
                    <Badge
                      variant={item.is_active ? 'success' : 'error'}
                      dot
                      size="sm"
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  {/* Created Date */}
                  <td className="py-3.5 px-6 text-xs text-slate-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{formattedDate}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    {item.is_active ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStatus(item)}
                        disabled={updatingUserId !== null && !isCurrentUpdating}
                        isLoading={isCurrentUpdating}
                        className="text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 shadow-2xs"
                        leftIcon={<UserX className="h-3.5 w-3.5" />}
                        aria-label={`Deactivate account for ${item.name}`}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStatus(item)}
                        disabled={updatingUserId !== null && !isCurrentUpdating}
                        isLoading={isCurrentUpdating}
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-2xs"
                        leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                        aria-label={`Activate account for ${item.name}`}
                      >
                        Activate
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>

      {/* Pagination Controls Footer */}
      {totalRecords > 0 && (
        <div className="border-t border-slate-200/90 bg-slate-50/50 py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-600 font-medium">
            {rangeText}
          </p>

          <nav aria-label="Users table pagination" className="flex items-center gap-1.5 flex-wrap justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              leftIcon={<ChevronsLeft className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to first page"
            >
              First
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to previous page"
            >
              Previous
            </Button>

            <span className="text-xs text-slate-700 font-medium px-2">
              Page <span className="font-bold text-slate-900">{safeCurrentPage}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to next page"
            >
              Next
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              rightIcon={<ChevronsRight className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to last page"
            >
              Last
            </Button>
          </nav>
        </div>
      )}
    </Card>
  );
}

export default UsersTable;
