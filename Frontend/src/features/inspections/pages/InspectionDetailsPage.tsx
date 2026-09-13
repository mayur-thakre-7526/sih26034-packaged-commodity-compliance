import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Package,
  Copy,
  Check,
  AlertOctagon,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { useInspectionDetails } from '../hooks/useInspectionDetails';
import { useProductDetails } from '@/features/products/hooks/useProductDetails';
import {
  extractNormalizedDeclarations,
  extractComplianceFindings,
  getComplianceBadgeVariant,
} from '../utils/complianceNormalizer';

export function InspectionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    inspection,
    isLoading,
    error,
    isDownloading,
    downloadError,
    fetchInspection,
    downloadReport,
  } = useInspectionDetails();

  const {
    product,
    isLoading: isProductLoading,
    fetchProduct,
    clearProduct,
  } = useProductDetails();

  const [copiedId, setCopiedId] = useState(false);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number>(1);

  // Fetch inspection by route parameter
  useEffect(() => {
    if (id) {
      fetchInspection(id);
    }
  }, [id, fetchInspection]);

  // Fetch product metadata once scan record is loaded
  useEffect(() => {
    if (inspection?.product_id) {
      fetchProduct(inspection.product_id);
    } else {
      clearProduct();
    }
  }, [inspection?.product_id, fetchProduct, clearProduct]);

  const handleCopyId = () => {
    if (inspection?.id) {
      navigator.clipboard.writeText(inspection.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Shared normalization utilities partitioning confirmed violations from uncertain review flags
  const { confirmedViolations, reviewFlags, importStatus } = useMemo(
    () => extractComplianceFindings(inspection?.result),
    [inspection?.result]
  );

  const declarations = useMemo(
    () => extractNormalizedDeclarations(inspection?.result, importStatus),
    [inspection?.result, importStatus]
  );

  const summary = inspection?.result?.compliance?.summary;
  const badgeInfo = useMemo(
    () =>
      getComplianceBadgeVariant(
        summary?.overall_status,
        inspection?.status,
        { detailed: true }
      ),
    [summary?.overall_status, inspection?.status]
  );

  const screeningVerdictLabel = useMemo(() => {
    const normScan = inspection?.status?.toLowerCase();
    const normOverall = summary?.overall_status?.toLowerCase();

    if (normScan === 'processing') {
      return 'PROCESSING SCAN';
    }
    if (normScan === 'failed') {
      return 'VERIFICATION FAILED';
    }
    if (normOverall === 'compliant') {
      return 'COMPLIANT — REVIEW REQUIRED';
    }
    if (normOverall === 'non_compliant') {
      return 'NON-COMPLIANT — REVIEW REQUIRED';
    }
    return 'REVIEW REQUIRED';
  }, [summary?.overall_status, inspection?.status]);

  const screeningVerdictSubtitle = useMemo(() => {
    const normOverall = summary?.overall_status?.toLowerCase();
    if (normOverall === 'compliant') {
      return 'AI-assisted screening detected standard packaging declarations. Officer review recommended prior to statutory clearance.';
    }
    if (normOverall === 'non_compliant') {
      return 'AI-assisted screening has flagged declarations for officer review.';
    }
    return 'AI-assisted screening requires administrative verification by the inspecting officer.';
  }, [summary?.overall_status]);

  const imageUrls = inspection?.image_urls || [];
  const processingMs = inspection?.result?.processing_ms;
  const qualityFlags = inspection?.result?.quality_flags || [];

  const isScanProcessing = inspection?.status === 'processing';
  const isScanFailed = inspection?.status === 'failed';
  const hasComplianceResult = Boolean(inspection?.result && inspection.result.compliance);

  // PDF report download is strictly available only for completed scans with compliance results
  const canDownloadReport = Boolean(
    inspection &&
    inspection.status === 'completed' &&
    hasComplianceResult
  );

  const formattedDate = inspection?.created_at
    ? new Date(inspection.created_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

  return (
    <PageContainer
      breadcrumbs={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inspections')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="text-slate-600 hover:text-slate-900 -ml-2 h-8 px-2"
        >
          Back to Inspections
        </Button>
      }
      title={`Inspection Record #${id ? id.slice(0, 8) : '...'}`}
      description="Legal Metrology (Packaged Commodities) statutory compliance audit and automated verification dossier"
      actions={
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2.5">
          <Badge variant={badgeInfo.variant} dot size="md" className="shrink-0">
            {screeningVerdictLabel}
          </Badge>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => id && fetchInspection(id)}
              isLoading={isLoading}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            {canDownloadReport && inspection && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadReport(inspection.id)}
                isLoading={isDownloading}
                leftIcon={<FileDown className="h-4 w-4" />}
                className="whitespace-nowrap"
              >
                Download PDF Report
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Download error banner */}
        {downloadError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{downloadError}</span>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !inspection && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
              <Skeleton className="h-5 w-48" />
              <SkeletonText lines={4} />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            title="Unable to Access Inspection Dossier"
            message={error}
            retryAction={() => id && fetchInspection(id)}
            retryLabel="Retry Connection"
          />
        )}

        {/* Inspection Dossier Content */}
        {inspection && !isLoading && (
          <div className="space-y-6">
            {/* 0. Regulatory AI Disclaimer Banner */}
            <div className="p-3.5 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs text-blue-900 flex items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" />
                <span className="font-semibold text-blue-950 leading-relaxed">
                  AI-assisted compliance screening. Final regulatory verification remains with the authorized inspecting officer.
                </span>
              </div>
              <span className="hidden md:inline-flex text-[11px] text-blue-700 font-medium px-2 py-0.5 rounded bg-blue-100/70 shrink-0 font-mono">
                Legal Metrology (Packaged Commodities) Rules, 2011
              </span>
            </div>

            {/* 1. Processing State Banner */}
            {isScanProcessing && (
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-start gap-3 shadow-2xs">
                <Clock className="h-5 w-5 text-sky-700 animate-pulse shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-sky-950">Compliance Verification in Progress</p>
                  <p className="text-sky-800 mt-1 leading-relaxed">
                    The packaging evidence images are currently undergoing optical character recognition, declaration extraction, and Legal Metrology rule validation. Please refresh or wait a few moments.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Dedicated Failure Banner */}
            {isScanFailed && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-3 shadow-2xs">
                <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-rose-950">Inspection Scan Failed</p>
                  <p className="text-rose-800 mt-1 leading-relaxed">
                    This inspection could not complete successfully. Optical analysis was unable to extract mandatory statutory declarations. Please ensure packaging panels are well-lit, in focus, and free of glare or obstructions, then initiate a new scan.
                  </p>
                  {inspection.result &&
                    typeof inspection.result === 'object' &&
                    'error' in inspection.result &&
                    Boolean((inspection.result as Record<string, unknown>).error) && (
                      <p className="mt-2 font-mono text-[11px] text-rose-900 bg-rose-100/70 p-2.5 rounded border border-rose-200">
                        Reason: {String((inspection.result as Record<string, unknown>).error)}
                      </p>
                    )}
                </div>
              </div>
            )}

            {/* 3. Missing Compliance Result Banner */}
            {!isScanProcessing && !isScanFailed && !hasComplianceResult && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-amber-950">Compliance Evaluation Data Unavailable</p>
                  <p className="text-amber-800 mt-1">
                    No statutory compliance analysis records were returned for this inspection scan.
                  </p>
                </div>
              </div>
            )}

            {/* 4. EXECUTIVE HERO: Compliance Verdict & Violation Severity */}
            <Card className="border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Overall Verdict & Product Identity */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono px-2.5 py-1 bg-slate-800/90 rounded-md border border-slate-700">
                        AI SCREENING RESULT
                      </span>
                      <Badge
                        variant={badgeInfo.variant}
                        size="md"
                        className="uppercase tracking-wider font-bold text-xs px-3 py-1"
                      >
                        {screeningVerdictLabel}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">
                        SCAN RECORD #{inspection.id ? inspection.id.slice(0, 8) : '...'}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        {product?.product_name || 'Standard Packaged Commodity'}
                        {product?.brand_name && (
                          <span className="text-slate-400 font-normal text-base sm:text-lg ml-2">
                            ({product.brand_name})
                          </span>
                        )}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                        {screeningVerdictSubtitle}
                      </p>
                    </div>

                    {/* Metadata Sub-Row */}
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1 border-t border-slate-700/60">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formattedDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        {product?.generic_name ? product.generic_name : 'Regulated Packaged Commodity'}
                      </span>
                      {processingMs !== undefined && (
                        <span className="flex items-center gap-1.5 font-mono text-emerald-400">
                          <Clock className="h-3.5 w-3.5 text-emerald-400" />
                          Screening Duration: {(processingMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Severity Cards Grid */}
                  {summary && (
                    <div className="grid grid-cols-3 gap-3 shrink-0">
                      <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 text-center min-w-28 shadow-2xs">
                        <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">
                          Critical
                        </span>
                        <span className="text-3xl font-black text-rose-400 block tabular-nums my-0.5">
                          {summary.critical ?? 0}
                        </span>
                        <span className="text-[10px] text-rose-300/80 block font-medium">
                          Non-Compliance
                        </span>
                      </div>

                      <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 text-center min-w-28 shadow-2xs">
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                          Major
                        </span>
                        <span className="text-3xl font-black text-amber-400 block tabular-nums my-0.5">
                          {summary.major ?? 0}
                        </span>
                        <span className="text-[10px] text-amber-300/80 block font-medium">
                          Deficiencies
                        </span>
                      </div>

                      <div className="bg-blue-950/40 border border-blue-500/40 rounded-xl p-4 text-center min-w-28 shadow-2xs">
                        <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">
                          Minor
                        </span>
                        <span className="text-3xl font-black text-blue-400 block tabular-nums my-0.5">
                          {summary.minor ?? 0}
                        </span>
                        <span className="text-[10px] text-blue-300/80 block font-medium">
                          Observations
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quality Observations Strip if present */}
              {qualityFlags.length > 0 && (
                <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-600 font-semibold">Packaging Observations:</span>
                  {qualityFlags.map((flag, idx) => (
                    <Badge key={idx} variant="warning" size="sm" className="font-mono text-[10px]">
                      {flag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* 5. STATUTORY DECLARATION CHECKLIST (Priority Placement) */}
            {!isScanProcessing && !isScanFailed && (
              <Card className="border-slate-200 shadow-xs overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Statutory Declaration Checklist
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Mandatory declarations required under Legal Metrology (Packaged Commodities) Rules, 2011
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {declarations.length} Items Evaluated
                  </Badge>
                </CardHeader>

                <CardContent className="p-0 overflow-x-auto">
                  {declarations.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 italic">
                      No statutory declaration fields detected in this inspection scan.
                    </div>
                  ) : (
                    <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                      <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th scope="col" className="py-3.5 px-6 w-2/5 min-w-[200px]">Mandatory Declaration Item</th>
                          <th scope="col" className="py-3.5 px-5 w-44 min-w-[140px]">Statutory Status</th>
                          <th scope="col" className="py-3.5 px-6">Detected Value / Label Text</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {declarations.map((decl, idx) => {
                          const isMissing = !decl.found && !(decl.isConditional && (importStatus === 'domestic' || importStatus === 'unknown'));
                          const isNotApplicable = !decl.found && decl.isConditional && importStatus === 'domestic';
                          const isReview = !decl.found && decl.isConditional && importStatus === 'unknown';

                          let rowBg = 'hover:bg-slate-50/70 transition-colors';
                          if (isMissing) {
                            rowBg = 'bg-rose-50/30 hover:bg-rose-50/50 transition-colors';
                          } else if (isNotApplicable) {
                            rowBg = 'bg-slate-50/40 hover:bg-slate-50/60 transition-colors opacity-80';
                          } else if (isReview) {
                            rowBg = 'bg-amber-50/25 hover:bg-amber-50/45 transition-colors';
                          }

                          return (
                            <tr key={idx} className={rowBg}>
                              <td className="py-3.5 px-6 align-top">
                                <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                                  {decl.name}
                                </div>
                                {decl.applicabilityNote && (
                                  <p className="text-[11px] font-normal text-slate-500 mt-0.5 leading-snug">
                                    {decl.applicabilityNote}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-5 align-top whitespace-nowrap">
                                {decl.found ? (
                                  <Badge variant="success" size="sm" className="font-semibold tracking-wide">
                                    ✓ Detected
                                  </Badge>
                                ) : isReview ? (
                                  <Badge variant="warning" size="sm" className="font-semibold tracking-wide" title={decl.applicabilityNote}>
                                    ⚠ Review
                                  </Badge>
                                ) : isNotApplicable ? (
                                  <Badge variant="neutral" size="sm" className="font-medium text-slate-600" title={decl.applicabilityNote}>
                                    — Not Applicable
                                  </Badge>
                                ) : (
                                  <Badge variant="error" size="sm" className="font-semibold tracking-wide">
                                    ✕ Missing
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3.5 px-6 align-top">
                                {decl.value === 'Not detected' || !decl.value ? (
                                  <span className="text-slate-400 italic text-xs">Not detected</span>
                                ) : (
                                  <span className="font-mono text-xs text-slate-800 break-words leading-relaxed select-all">
                                    {decl.value}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 6. Confirmed Regulatory Violations */}
            {!isScanProcessing && !isScanFailed && hasComplianceResult && (
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Confirmed Regulatory Violations
                    </CardTitle>
                  </div>
                  <Badge
                    variant={confirmedViolations.length > 0 ? 'error' : 'success'}
                    size="sm"
                  >
                    {confirmedViolations.length}{' '}
                    {confirmedViolations.length === 1 ? 'Violation' : 'Violations'}
                  </Badge>
                </CardHeader>

                <CardContent className="p-6">
                  {confirmedViolations.length === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        No confirmed regulatory violations detected for this commodity.{' '}
                        {reviewFlags.length > 0
                          ? 'Applicability verification is required for the conditional item(s) flagged below.'
                          : 'All inspected statutory declarations satisfy Legal Metrology packaging mandates.'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {confirmedViolations.map((v, idx) => {
                        let badgeVariant: BadgeVariant = 'warning';
                        if (v.severity === 'critical') badgeVariant = 'error';
                        else if (v.severity === 'minor') badgeVariant = 'neutral';

                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-rose-200/80 bg-rose-50/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
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
                              <Badge variant={badgeVariant} size="sm" className="uppercase tracking-wider">
                                {v.severity}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 7. Applicability Review Flags (e.g. UNKNOWN import status) */}
            {!isScanProcessing && !isScanFailed && hasComplianceResult && reviewFlags.length > 0 && (
              <Card className="border-amber-200 shadow-xs">
                <CardHeader className="py-4 px-6 border-b border-amber-100 bg-amber-50/40 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-amber-700" />
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Applicability Requires Review
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600 mt-0.5">
                        Statutory requirements conditional on classification that could not be confirmed from packaging evidence
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="warning" size="sm">
                    {reviewFlags.length} {reviewFlags.length === 1 ? 'Item for Review' : 'Items for Review'}
                  </Badge>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  {/* Explanatory context alert banner */}
                  <div className="p-3.5 bg-amber-50/75 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-950">
                        Import Status Undetermined
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Import status could not be determined from the available evidence. Under the Legal Metrology (Packaged Commodities) Rules, country-of-origin and importer declarations are mandatory exclusively for imported packages. The finding below requires administrative review, not an automated legal violation determination.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {reviewFlags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-amber-200/90 bg-amber-50/30 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-2xs"
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
                              Classification: {importStatus.toUpperCase()}
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

                        <div className="shrink-0 self-start sm:self-center">
                          <Badge variant="warning" size="sm" className="uppercase tracking-wider">
                            Requires Review
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 8. Regulated Commodity & Record Details */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-700" />
                  <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Registered Commodity & Inspection Dossier
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-500">ID: {inspection.id}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyId}
                    className="p-1 h-7 w-7 text-slate-500 hover:text-slate-800"
                    title="Copy full Inspection UUID"
                  >
                    {copiedId ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {isProductLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Product Name
                      </span>
                      <p className="text-sm font-semibold text-slate-900 mt-1">
                        {product?.product_name || 'Standard Packaged Commodity'}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Brand Name
                      </span>
                      <p className="text-xs font-medium text-slate-800 mt-1.5">
                        {product?.brand_name || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Generic Classification
                      </span>
                      <p className="text-xs font-medium text-slate-800 mt-1.5">
                        {product?.generic_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            {product.generic_name}
                          </span>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Assigned Inspector
                      </span>
                      <p className="font-mono text-xs text-slate-700 font-medium mt-1.5 truncate">
                        {inspection.user_id || 'Authorized Inspecting Officer'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 9. Scanned Package Evidence Gallery */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-600" />
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Official Package Evidence Gallery
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Archived physical packaging evidence images for statutory chain of custody
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="neutral" size="sm">
                  {imageUrls.length} {imageUrls.length === 1 ? 'Evidence Image' : 'Evidence Images'}
                </Badge>
              </CardHeader>

              <CardContent className="p-6">
                {imageUrls.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                    No physical package images recorded for this inspection.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {imageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col"
                      >
                        {/* Header with Evidence Number */}
                        <div className="px-3.5 py-2.5 bg-slate-50/85 border-b border-slate-200/80 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 font-mono tracking-tight">
                            Evidence Frame #{idx + 1}
                          </span>
                          <span className="inline-flex items-center text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold uppercase tracking-wider">
                            Archived
                          </span>
                        </div>

                        {/* Image Preview & Interactive Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveLightboxUrl(url);
                            setActiveLightboxIndex(idx + 1);
                          }}
                          aria-label={`Inspect evidence frame ${idx + 1} at full resolution`}
                          className="relative aspect-4/3 w-full overflow-hidden bg-slate-100 flex items-center justify-center group/btn focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-inset cursor-pointer"
                        >
                          <img
                            src={url}
                            alt={`Inspection evidence frame ${idx + 1}`}
                            className="object-cover w-full h-full group-hover/btn:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/btn:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                            <Eye className="h-4 w-4" />
                            <span>Enlarge Frame</span>
                          </div>
                        </button>

                        {/* Card Footer Action */}
                        <div className="px-3.5 py-2 bg-slate-50/50 border-t border-slate-200/70 flex items-center justify-between mt-auto">
                          <span className="text-[11px] text-slate-500 font-mono font-medium">
                            Panel {idx + 1} of {imageUrls.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLightboxUrl(url);
                              setActiveLightboxIndex(idx + 1);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                            aria-label={`Inspect evidence frame ${idx + 1}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evidence Full Resolution Lightbox Modal */}
            {activeLightboxUrl && (
              <Modal
                isOpen={Boolean(activeLightboxUrl)}
                onClose={() => setActiveLightboxUrl(null)}
                size="xl"
                title={
                  <div className="flex items-center gap-2.5">
                    <ImageIcon className="h-5 w-5 text-blue-700 shrink-0" />
                    <span className="font-bold text-slate-900">
                      Inspection Evidence Frame #{activeLightboxIndex}
                    </span>
                    <span className="text-xs text-slate-500 font-mono font-medium">
                      ({activeLightboxIndex} of {imageUrls.length})
                    </span>
                  </div>
                }
                description="Official high-resolution physical packaging panel evidence archived for statutory chain of custody"
                footer={
                  <div className="flex items-center justify-between w-full flex-wrap gap-2">
                    <span className="text-xs text-slate-500 font-mono">
                      Statutory record for Inspection #{id ? id.slice(0, 8) : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveLightboxUrl(null)}
                      >
                        Close
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => window.open(activeLightboxUrl, '_blank', 'noopener,noreferrer')}
                        leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                      >
                        Open Full Resolution
                      </Button>
                    </div>
                  </div>
                }
              >
                <div className="flex items-center justify-center bg-slate-950/95 rounded-lg overflow-hidden p-3 min-h-[300px] max-h-[72vh]">
                  <img
                    src={activeLightboxUrl}
                    alt={`Inspection evidence frame ${activeLightboxIndex}`}
                    className="max-h-[66vh] w-auto max-w-full object-contain rounded shadow-lg select-none"
                  />
                </div>
              </Modal>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default InspectionDetailsPage;
