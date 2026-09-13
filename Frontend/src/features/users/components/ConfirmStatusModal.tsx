import { AlertTriangle, UserX, UserCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { User } from '../types';

export interface ConfirmStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: User | null;
  isLoading: boolean;
}

export function ConfirmStatusModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading,
}: ConfirmStatusModalProps) {
  if (!user) return null;

  const willDeactivate = user.is_active;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          {willDeactivate ? (
            <>
              <UserX className="h-5 w-5 text-rose-600" aria-hidden="true" />
              <span className="text-slate-900 font-semibold">Deactivate User Account</span>
            </>
          ) : (
            <>
              <UserCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span className="text-slate-900 font-semibold">Activate User Account</span>
            </>
          )}
        </div>
      }
      description={
        willDeactivate
          ? 'Revoke platform login and inspection capabilities for this official.'
          : 'Restore platform login and system privileges for this official.'
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-200 text-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className={
              willDeactivate
                ? 'bg-rose-600 hover:bg-rose-700 border-rose-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white'
            }
          >
            {willDeactivate ? 'Deactivate User' : 'Activate User'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 py-1">
        <p className="text-sm text-slate-600 leading-relaxed">
          Are you sure you want to {willDeactivate ? 'deactivate' : 'activate'}{' '}
          <span className="font-semibold text-slate-900">{user.name}</span> ({user.email})?
        </p>

        {willDeactivate ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 shadow-2xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <span>
              Deactivating this account will immediately revoke all access and prevent the user from
              logging in.
            </span>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2 shadow-2xs">
            <UserCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
            <span>
              Activating this account will permit the user to authenticate and perform actions under the{' '}
              <strong className="capitalize">{user.role}</strong> role.
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ConfirmStatusModal;
