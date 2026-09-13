import { ShieldCheck, LockKeyhole } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              SIH26034 Portal
            </span>
            <p className="text-sm font-bold text-slate-900 leading-tight">
              Legal Metrology Compliance System
            </p>
          </div>
        </div>
      </header>

      {/* Main Centered Sign-in Card */}
      <main className="w-full max-w-md mx-auto my-8">
        <Card elevated className="border-slate-300 shadow-md">
          <CardHeader className="text-center pb-4 pt-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-8 ring-blue-50/50">
              <LockKeyhole className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Sign In to Official Account
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authorized personnel access for inspection and administration
            </p>
          </CardHeader>

          <CardContent className="pt-2 pb-6 px-6 sm:px-8">
            <LoginForm />

            {/* Prototype Notice */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-[11px] leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-700">Notice:</span> SIH26034 compliance portal. Access is restricted to authorized personnel.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Portal Footer */}
      <footer className="w-full max-w-5xl mx-auto pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <p>© 2026 SIH26034 Compliance System. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span>Official Portal</span>
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
