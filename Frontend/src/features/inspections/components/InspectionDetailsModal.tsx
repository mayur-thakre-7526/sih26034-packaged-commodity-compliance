import { useEffect, useMemo } from 'react';
import {
  FileDown,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { useInspectionDetails } from '../hooks/useInspectionDetails';
import {
  extractNormalizedDeclarations,
  extractComplianceFindings,
  getComplianceBadgeVariant,
} from '../utils/complianceNormalizer';

export interface InspectionDetailsModalProps {
  inspectionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InspectionDetailsModal({
  inspectionId,
  isOpen,
  onClose,
}: InspectionDetailsModalProps) {
  const {
    inspection,
    isLoading,
    error,
    isDownloading,
    downloadError,
    fetchInspection,
    downloadReport,
    clearInspection,
  } = useInspectionDetails();

  useEffect(() => {
    if (isOpen && inspectionId) {
      fetchInspection(inspectionId);
    } else if (!isOpen) {
      clearInspection();
    }
  }, [isOpen, inspectionId, fetchInspection, clearInspection]);

  // Shared normalization utilities partitioning confirmed violations from uncertain review flags
  const summary = inspection?.result?.compliance?.summary;
  const { confirmedViolations, reviewFlags, importStatus } = useMemo(
    () => extractComplianceFindings(inspection?.result),
    [inspection?.result]
  );
  const declarations = useMemo(
    () => extractNormalizedDeclarations(inspection?.result, importStatus),
    [inspection?.result, importStatus]
  );
  const badgeInfo = useMemo(
    () =>
      getComplianceBadgeVariant(
        summary?.overall_status,
        inspection?.status,
        { detailed: true }
      ),
    [summary?.overall_status, inspection?.status]
  );

  const imageUrls = inspection?.image_urls || [];
  const isScanProcessing = inspection?.status === 'processing';
  const isScanFailed = inspection?.status === 'failed';
  const hasComplianceResult = Boolean(inspection?.result && inspection.result.compliance);

  // PDF report is strictly available only for completed scans with a compliance result
  const canDownloadReport = Boolean(
    inspection &&
    inspection.status === 'completed' &&
    hasComplianceResult
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold text-slate-900">
            Inspection Details
          </span>
          {inspection && (
            <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              #{inspection.id.slice(0, 8)}
            </span>
          )}
        </div>
      }
      description="Legal Metrology statutory compliance evaluation, extracted package declarations, and rule audit findings"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            {downloadError && (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {downloadError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-200 text-slate-700"
            >
              Close
            </Button>
            {canDownloadReport && inspection && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => downloadReport(inspection.id)}
                isLoading={isDownloading}
                leftIcon={<FileDown className="h-4 w-4" />}
              >
                Download PDF Report
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Loading State */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Spinner size="lg" className="text-blue-700 mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading inspection audit records...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving scan data and compliance analysis</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="Could Not Load Inspection"
          message={error}
          retryAction={() => inspectionId && fetchInspection(inspectionId)}
          retryLabel="Retry"
        />
      )}

      {/* Loaded Inspection Data */}
      {inspection && !isLoading && (
        <div className="space-y-6">
          {/* Top Status & Overview Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Compliance Status
                </span>
                <div className="mt-1">
                  <Badge variant={badgeInfo.variant} dot size="md">
                    {badgeInfo.label}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Scanner Status
                </span>
                <p className="text-sm font-semibold text-slate-900 capitalize mt-1">
                  {inspection.status}
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Product ID
                </span>
                <p className="text-xs font-mono font-medium text-slate-700 mt-1 truncate" title={inspection.product_id}>
                  {inspection.product_id.length > 12 ? `${inspection.product_id.slice(0, 12)}...` : inspection.product_id}
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Inspector UID
                </span>
                <p className="text-xs font-mono font-medium text-slate-700 mt-1 truncate" title={inspection.user_id || 'System'}>
                  {inspection.user_id ? `${inspection.user_id.slice(0, 12)}...` : 'System Verified'}
                </p>
              </div>
            </div>
          </div>

          {/* 1. Processing State Banner */}
          {isScanProcessing && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-start gap-3 shadow-2xs">
              <Clock className="h-5 w-5 text-sky-700 animate-pulse shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Compliance Verification in Progress</p>
                <p className="text-sky-700 mt-0.5">
                  The packaging evidence images are currently undergoing optical character recognition, declaration extraction, and Legal Metrology rule validation.
                </p>
              </div>
            </div>
          )}

          {/* 2. Failed State Banner */}
          {isScanFailed && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-3 shadow-2xs">
              <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Inspection Scan Failed</p>
                <p className="text-rose-700 mt-0.5">
                  {(inspection.result as Record<string, unknown> | undefined)?.error
                    ? String((inspection.result as Record<string, unknown>).error)
                    : 'Automated verification was unable to complete. The evidence images may be blurry, corrupt, or could not be processed.'}
                </p>
              </div>
            </div>
          )}

          {/* 3. Unavailable Result Banner (Completed but missing result data) */}
          {!isScanProcessing && !isScanFailed && !hasComplianceResult && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Compliance Results Unavailable</p>
                <p className="text-amber-700 mt-0.5">
                  No statutory compliance analysis data was found for this inspection record.
                </p>
              </div>
            </div>
          )}

          {/* Severity Metrics Cards (only when summary is available) */}
          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-3 text-center">
                <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
                  Critical Violations
                </span>
                <span className="text-xl font-bold text-rose-700 mt-1 block">
                  {summary.critical ?? 0}
                </span>
              </div>
              <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 text-center">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                  Major Violations
                </span>
                <span className="text-xl font-bold text-amber-700 mt-1 block">
                  {summary.major ?? 0}
                </span>
              </div>
              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 text-center">
                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider block">
                  Minor Violations
                </span>
                <span className="text-xl font-bold text-blue-700 mt-1 block">
                  {summary.minor ?? 0}
                </span>
              </div>
            </div>
          )}

          {/* Uploaded Package Images Gallery */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <ImageIcon className="h-4 w-4 text-slate-600" />
              Scanned Package Images ({imageUrls.length})
            </h4>
            {imageUrls.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-md p-3">
                No package images stored for this inspection record.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-100 aspect-4/3 flex items-center justify-center"
                  >
                    <img
                      src={url}
                      alt={`Inspection Scan Frame ${idx + 1}`}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Full Size
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Declarations Breakdown */}
          {!isScanProcessing && !isScanFailed && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Extracted Mandatory Declarations ({declarations.length})
              </h4>
              {declarations.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-md p-3 text-center">
                  No statutory declaration fields detected in this inspection scan.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Declaration Item</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Detected Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {declarations.map((decl, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {decl.name}
                            {decl.applicabilityNote && (
                              <p className="text-[10px] font-normal text-slate-500 mt-0.5">
                                {decl.applicabilityNote}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {decl.found ? (
                              <Badge variant="success" dot size="sm">
                                Detected
                              </Badge>
                            ) : decl.isConditional && importStatus === 'unknown' ? (
                              <Badge variant="warning" dot size="sm" title={decl.applicabilityNote}>
                                Requires Review
                              </Badge>
                            ) : decl.isConditional && importStatus === 'domestic' ? (
                              <Badge variant="neutral" size="sm" title={decl.applicabilityNote}>
                                Not Applicable
                              </Badge>
                            ) : (
                              <Badge variant="error" dot size="sm">
                                Missing
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-700">
                            {decl.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Rule Violations */}
          {!isScanProcessing && !isScanFailed && hasComplianceResult && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2.5 text-rose-700">
                <AlertTriangle className="h-4 w-4" />
                Confirmed Rule Violations ({confirmedViolations.length})
              </h4>
              {confirmedViolations.length === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2.5 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    No confirmed regulatory violations detected for this commodity.{' '}
                    {reviewFlags.length > 0
                      ? 'Applicability verification is required for the conditional item(s) flagged below.'
                      : 'All inspected statutory declarations satisfy Legal Metrology packaging mandates.'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {confirmedViolations.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 text-xs flex items-start justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-rose-900">
                            {v.code}
                          </span>
                          {v.field && (
                            <span className="text-[11px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              Field: {v.field}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {v.message}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Badge
                          variant={
                            v.severity === 'critical'
                              ? 'error'
                              : v.severity === 'major'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                          className="uppercase tracking-wider"
                        >
                          {v.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applicability Review Flags (e.g. UNKNOWN import status) */}
          {!isScanProcessing && !isScanFailed && hasComplianceResult && reviewFlags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-2 text-amber-800">
                <HelpCircle className="h-4 w-4 text-amber-700" />
                Applicability Requires Review ({reviewFlags.length})
              </h4>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 mb-2.5 flex items-start gap-2 shadow-2xs">
                <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-amber-800 leading-relaxed">
                  Import status could not be determined from the available evidence. Under Legal Metrology Rules, country-of-origin declarations are mandatory exclusively for imported packages. The item below requires administrative review, not an automated legal violation determination.
                </p>
              </div>
              <div className="space-y-2">
                {reviewFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/30 text-xs flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-amber-950">
                          {flag.code}
                        </span>
                        {flag.field && (
                          <span className="text-[11px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                            Field: {flag.field}
                          </span>
                        )}
                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          Import Status: {importStatus.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        {flag.message}
                      </p>
                      {flag.reviewReason && (
                        <p className="text-[11px] text-amber-800 font-medium pt-0.5">
                          Review note: {flag.reviewReason}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <Badge variant="warning" size="sm" className="uppercase tracking-wider">
                        Requires Review
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default InspectionDetailsModal;
