import { useState, type FormEvent } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin } from '../hooks/useLogin';
import type { LoginCredentials } from '../types';

export function LoginForm() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, generalError, fieldErrors, clearError } = useLogin();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await login(credentials);
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    if (generalError || fieldErrors[field]) {
      clearError();
    }
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-md border border-rose-200 bg-rose-50 text-rose-900 text-xs animate-in fade-in duration-200"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 font-medium leading-relaxed">{generalError}</div>
        </div>
      )}

      {/* Email Input */}
      <Input
        label="Official Email Address"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="officer@nic.in"
        required
        value={credentials.email}
        onChange={(e) => handleInputChange('email', e.target.value)}
        error={fieldErrors.email}
        leftElement={<Mail className="h-4 w-4" aria-hidden="true" />}
        disabled={isLoading}
      />

      {/* Password Input */}
      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
        value={credentials.password}
        onChange={(e) => handleInputChange('password', e.target.value)}
        error={fieldErrors.password}
        leftElement={<Lock className="h-4 w-4" aria-hidden="true" />}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isLoading}
            className="cursor-pointer p-1 text-slate-400 hover:text-slate-600 focus:outline-hidden focus:text-slate-800 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        }
        disabled={isLoading}
      />

      {/* Submit Action */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full justify-center shadow-sm"
          isLoading={isLoading}
          rightIcon={<LogIn className="h-4 w-4" aria-hidden="true" />}
        >
          Sign In to Portal
        </Button>
      </div>
    </form>
  );
}

export default LoginForm;
