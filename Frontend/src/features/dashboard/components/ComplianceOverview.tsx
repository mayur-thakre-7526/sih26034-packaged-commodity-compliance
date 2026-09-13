import { ShieldAlert, ShieldCheck, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface ComplianceOverviewProps {
  compliantCount: number;
  nonCompliantCount: number;
  criticalViolations: number;
  majorViolations: number;
  minorViolations: number;
}

export function ComplianceOverview({
  compliantCount,
  nonCompliantCount,
  criticalViolations,
  majorViolations,
  minorViolations,
}: ComplianceOverviewProps) {
  const totalEvaluated = compliantCount + nonCompliantCount;
  const compliantPercentage =
    totalEvaluated > 0 ? Math.round((compliantCount / totalEvaluated) * 100) : 0;

  return (
    <Card className="h-full flex flex-col border-slate-200 shadow-xs">
      <CardHeader className="py-4 px-6 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Compliance & Violation Severity
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Statutory evaluation ratio and categorized violation severity distribution
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-6">
        {/* Compliance Rate Bar & Indicators */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2.5 font-medium">
            <span className="text-slate-700 flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Compliant: {compliantCount}
            </span>
            <span className="text-slate-700 flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Non-Compliant: {nonCompliantCount}
            </span>
          </div>

          {totalEvaluated === 0 ? (
            <div className="w-full h-3.5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-400 font-medium">
              No completed inspections evaluated yet
            </div>
          ) : (
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner" aria-label={`Compliance rate: ${compliantPercentage}%`}>
              <div
                className="bg-emerald-600 transition-all duration-500 rounded-l-full"
                style={{ width: `${compliantPercentage}%` }}
              />
              <div
                className="bg-rose-500 transition-all duration-500 rounded-r-full"
                style={{ width: `${100 - compliantPercentage}%` }}
              />
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
            <span>Evaluated Dossiers: <strong className="text-slate-800 font-semibold">{totalEvaluated}</strong></span>
            <span>
              Compliance Ratio: <strong className="text-slate-900 font-bold">{totalEvaluated > 0 ? `${compliantPercentage}%` : 'N/A'}</strong>
            </span>
          </div>
        </div>

        {/* Violations Severity Distribution */}
        <div className="pt-5 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            Violations Categorized by Statutory Severity
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Critical */}
            <div className="p-3.5 rounded-xl border border-rose-200/90 bg-rose-50/40 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0" />
                  Critical
                </span>
                <Badge variant="error" size="sm">
                  High Risk
                </Badge>
              </div>
              <p className="mt-2.5 text-2xl font-black text-rose-950 tabular-nums">
                {criticalViolations.toLocaleString()}
              </p>
              <p className="text-[11px] text-rose-800/80 font-medium mt-0.5">
                Mandatory breach
              </p>
            </div>

            {/* Major */}
            <div className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/40 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  Major
                </span>
                <Badge variant="warning" size="sm">
                  Medium Risk
                </Badge>
              </div>
              <p className="mt-2.5 text-2xl font-black text-amber-950 tabular-nums">
                {majorViolations.toLocaleString()}
              </p>
              <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
                Regulatory defect
              </p>
            </div>

            {/* Minor */}
            <div className="p-3.5 rounded-xl border border-blue-200/90 bg-blue-50/40 flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  Minor
                </span>
                <Badge variant="neutral" size="sm">
                  Low Risk
                </Badge>
              </div>
              <p className="mt-2.5 text-2xl font-black text-blue-950 tabular-nums">
                {minorViolations.toLocaleString()}
              </p>
              <p className="text-[11px] text-blue-800/80 font-medium mt-0.5">
                Advisory observation
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ComplianceOverview;
