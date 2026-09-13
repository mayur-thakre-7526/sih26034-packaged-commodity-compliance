import { useState, type FormEvent } from 'react';
import { UserPlus, AlertCircle, Lock, Mail, User as UserIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { usersService } from '../services/usersService';
import type { UserRole } from '../types';
import type { ApiError } from '@/types/api';

export interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roleOptions: SelectOption[] = [
  { value: 'inspector', label: 'Inspector (Field Compliance Officer)' },
  { value: 'admin', label: 'Admin (System Administrator)' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('inspector');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('inspector');
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Full Name is required.');
      return;
    }

    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please provide a valid email address (e.g. user@example.com).');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (role !== 'inspector' && role !== 'admin') {
      setError('Please select a valid role (Inspector or Admin).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await usersService.createUser({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      });

      // Clear password and form state immediately from memory
      resetForm();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.message ||
          'Failed to create user. Please verify the email is unique and inputs are valid.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-700" />
          <span>Create Official Account</span>
        </div>
      }
      description="Register a new authorized field compliance inspector or system administrator"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border-slate-200 text-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            Create User
          </Button>
        </div>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        {error && (
          <div
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start gap-2 shadow-2xs animate-in fade-in duration-150"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <Input
          id="create-user-name"
          name="name"
          autoComplete="off"
          label="Full Name"
          placeholder="e.g. Inspector Ramesh Kumar"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          required
          disabled={isSubmitting}
          leftElement={<UserIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />}
        />

        <Input
          id="create-user-email"
          name="email"
          type="email"
          autoComplete="off"
          label="Email Address"
          placeholder="e.g. ramesh.kumar@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          required
          disabled={isSubmitting}
          leftElement={<Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />}
        />

        <Input
          id="create-user-password"
          name="password"
          type="password"
          autoComplete="new-password"
          label="Initial Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          required
          disabled={isSubmitting}
          leftElement={<Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />}
          helperText="Minimum 6 characters. Credentials should be shared through secure channels."
        />

        <Select
          id="create-user-role"
          label="Administrative Role"
          options={roleOptions}
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRole);
            if (error) setError(null);
          }}
          required
          disabled={isSubmitting}
        />
      </form>
    </Modal>
  );
}

export default CreateUserModal;
