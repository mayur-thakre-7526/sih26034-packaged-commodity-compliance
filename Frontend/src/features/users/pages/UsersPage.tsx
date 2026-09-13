import { useState } from 'react';
import { RefreshCw, Users, UserPlus } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUsers } from '../hooks/useUsers';
import { UsersTable } from '../components/UsersTable';
import { UsersSkeleton } from '../components/UsersSkeleton';
import { CreateUserModal } from '../components/CreateUserModal';
import { ConfirmStatusModal } from '../components/ConfirmStatusModal';
import type { User } from '../types';

export function UsersPage() {
  const {
    users,
    isLoading,
    error,
    updatingUserId,
    updateError,
    clearUpdateError,
    toggleUserStatus,
    refetch,
  } = useUsers();

  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [userToConfirm, setUserToConfirm] = useState<User | null>(null);

  const handleOpenConfirm = (user: User) => {
    clearUpdateError();
    setUserToConfirm(user);
  };

  const handleCloseConfirm = () => {
    if (!updatingUserId) {
      setUserToConfirm(null);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!userToConfirm) return;
    const success = await toggleUserStatus(userToConfirm.id, userToConfirm.is_active);
    if (success) {
      setUserToConfirm(null);
    }
  };

  return (
    <PageContainer
      title="User Management"
      description="Authorized personnel administration, field inspector credentials, and administrative role assignments"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            aria-label="Refresh user directory"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateUserOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4" />}
            aria-label="Create new user account"
          >
            Create User
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status update error alert if action failed */}
        {updateError && (
          <ErrorState
            compact
            title="Unable to Update User Status"
            message={updateError}
            retryAction={clearUpdateError}
            retryLabel="Dismiss"
          />
        )}

        {/* Loading Skeleton */}
        {isLoading && users.length === 0 && <UsersSkeleton />}

        {/* Initial Load Error State */}
        {error && users.length === 0 && (
          <ErrorState
            title="Unable to Access User Records"
            message={error}
            retryAction={refetch}
            retryLabel="Retry Connection"
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && users.length === 0 && (
          <EmptyState
            title="No Users Registered"
            description="There are currently no authorized personnel records logged in the database."
            icon={<Users className="h-6 w-6 text-slate-400" />}
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateUserOpen(true)}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Create User
              </Button>
            }
          />
        )}

        {/* Live Users Table */}
        {users.length > 0 && (
          <UsersTable
            users={users}
            onToggleStatus={handleOpenConfirm}
            updatingUserId={updatingUserId}
          />
        )}
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        onSuccess={refetch}
      />

      {/* Confirm Status Change Modal */}
      <ConfirmStatusModal
        isOpen={!!userToConfirm}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmStatusChange}
        user={userToConfirm}
        isLoading={!!updatingUserId && updatingUserId === userToConfirm?.id}
      />
    </PageContainer>
  );
}

export default UsersPage;
