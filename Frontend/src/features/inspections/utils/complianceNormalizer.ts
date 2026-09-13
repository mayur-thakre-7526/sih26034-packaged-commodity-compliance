import type { BadgeVariant } from '@/components/ui/Badge';
import type {
  ComplianceResult,
  NormalizedDeclaration,
  NormalizedViolation,
  ViolationSeverity,
  ExtractedNetQuantity,
  ExtractedMRP,
  ExtractedDate,
  ExtractedConsumerCare,
  ExtractedDimensions,
  ImportStatus,
  NormalizedComplianceFindings,
} from '../types';

/**
 * Normalization output for compliance badge presentation.
 */
export interface ComplianceBadgeInfo {
  label: string;
  variant: BadgeVariant;
}

/**
 * Options for configuring compliance badge labels.
 */
export interface BadgeVariantOptions {
  detailed?: boolean;
}

/**
 * Safely format net quantity declaration object or primitive.
 */
function formatNetQuantity(raw: unknown): { displayVal: string; found: boolean } {
  if (!raw) return { displayVal: 'Not detected', found: false };

  if (typeof raw === 'object') {
    const nq = raw as ExtractedNetQuantity;
    if (nq.raw_text && nq.raw_text.trim()) {
      return { displayVal: nq.raw_text.trim(), found: true };
    }
    if (nq.value !== undefined && nq.value !== null) {
      const valStr = `${nq.value} ${nq.unit || ''}`.trim();
      return { displayVal: valStr, found: true };
    }
  }

  if (typeof raw === 'string' && raw.trim()) {
    return { displayVal: raw.trim(), found: true };
  }

  if (typeof raw === 'number') {
    return { displayVal: String(raw), found: true };
  }

  return { displayVal: 'Not detected', found: false };
}

/**
 * Safely format MRP declaration object or primitive.
 */
function formatMRP(raw: unknown): { displayVal: string; found: boolean } {
  if (!raw) return { displayVal: 'Not detected', found: false };

  if (typeof raw === 'object') {
    const mrp = raw as ExtractedMRP;
    if (mrp.raw_text && mrp.raw_text.trim()) {
      return { displayVal: mrp.raw_text.trim(), found: true };
    }
    if (mrp.value !== undefined && mrp.value !== null) {
      const formattedPrice = `₹${mrp.value.toFixed(2)}`;
      const taxNotice = mrp.has_tax_statement ? ' (Incl. of all taxes)' : '';
      return { displayVal: `${formattedPrice}${taxNotice}`, found: true };
    }
  }

  if (typeof raw === 'string' && raw.trim()) {
    return { displayVal: raw.trim(), found: true };
  }

  if (typeof raw === 'number') {
    return { displayVal: `₹${raw.toFixed(2)}`, found: true };
  }

  return { displayVal: 'Not detected', found: false };
}


/**
 * Safely format manufacture/packing date declaration.
 */
function formatMfgDate(raw: unknown): { displayVal: string; found: boolean } {
  if (!raw) return { displayVal: 'Not detected', found: false };

  if (typeof raw === 'object') {
    const d = raw as ExtractedDate;
    if (d.manufacture_month_year && d.manufacture_month_year.trim()) {
      return { displayVal: d.manufacture_month_year.trim(), found: true };
    }
  }

  if (typeof raw === 'string' && raw.trim()) {
    return { displayVal: raw.trim(), found: true };
  }

  return { displayVal: 'Not detected', found: false };
}

/**
 * Safely format use-by / best-before date declaration.
 */
function formatUseByDate(raw: unknown): { displayVal: string; found: boolean } {
  if (!raw) return { displayVal: 'Not detected', found: false };

  if (typeof raw === 'object') {
    const d = raw as ExtractedDate;
    if (d.best_before_text && d.best_before_text.trim()) {
      return { displayVal: d.best_before_text.trim(), found: true };
    }
  }

  return { displayVal: 'Not detected', found: false };
}

/**
 * Safely format consumer care contact details.
 */
function formatConsumerCare(raw: unknown): { displayVal: string; found: boolean } {
  if (!raw) return { displayVal: 'Not detected', found: false };

  if (typeof raw === 'object') {
    const cc = raw as ExtractedConsumerCare;
    const parts: string[] = [];
    if (cc.phone && cc.phone.trim()) parts.push(`Tel: ${cc.phone.trim()}`);
    if (cc.email && cc.email.trim()) parts.push(`Email: ${cc.email.trim()}`);
    if (cc.name && cc.name.trim()) parts.push(`Contact: ${cc.name.trim()}`);
    if (cc.address && cc.address.trim()) parts.push(`Address: ${cc.address.trim()}`);

    if (parts.length > 0) {
      return { displayVal: parts.join(' | '), found: true };
    }
  }

  if (typeof raw === 'string' && raw.trim()) {
    return { displayVal: raw.trim(), found: true };
  }

  return { displayVal: 'Not detected', found: false };
}

/**
 * Safely format package dimensions declaration.
 */
function formatDimensions(raw: unknown): { displayVal: string; found: boolean } {
  if (!raw) return { displayVal: 'Not detected', found: false };

  if (typeof raw === 'object') {
    const dim = raw as ExtractedDimensions;
    const parts: string[] = [];
    if (dim.num_pieces !== undefined && dim.num_pieces !== null) {
      parts.push(`${dim.num_pieces} Pieces`);
    }
    if (Array.isArray(dim.per_piece_dimensions) && dim.per_piece_dimensions.length > 0) {
      parts.push(`Dimensions: ${dim.per_piece_dimensions.join(', ')}`);
    }
    if (parts.length > 0) {
      return { displayVal: parts.join(' - '), found: true };
    }
  }

  if (typeof raw === 'string' && raw.trim()) {
    return { displayVal: raw.trim(), found: true };
  }

  return { displayVal: 'Not detected', found: false };
}

/**
 * Safely normalizes the real Python compliance declarations dictionary into an array
 * of standardized statutory declaration items for UI rendering.
 *
 * Expected backend path: result.declarations (dictionary)
 */
export function extractNormalizedDeclarations(
  result?: ComplianceResult | null,
  explicitImportStatus?: ImportStatus
): NormalizedDeclaration[] {
  if (!result) return [];

  const rawDeclarations = result.declarations;
  const importStatus = explicitImportStatus ?? extractImportStatus(result);

  // Primary Path: Backend returns declarations as a dictionary/object
  if (rawDeclarations && typeof rawDeclarations === 'object' && !Array.isArray(rawDeclarations)) {
    const declMap = rawDeclarations as Record<string, unknown>;

    // Canonical list of statutory declarations required under Legal Metrology Rules
    const items: NormalizedDeclaration[] = [
      {
        name: 'Generic / Common Name',
        found: Boolean(declMap.generic_name && String(declMap.generic_name).trim()),
        value: declMap.generic_name ? String(declMap.generic_name).trim() : 'Not detected',
      },
      (() => {
        const { displayVal, found } = formatNetQuantity(declMap.net_quantity);
        return { name: 'Net Quantity', found, value: displayVal };
      })(),
      (() => {
        const { displayVal, found } = formatMRP(declMap.mrp);
        return { name: 'Maximum Retail Price (MRP)', found, value: displayVal };
      })(),
      (() => {
        const { displayVal, found } = formatMfgDate(declMap.mfg_date);
        return { name: 'Manufacture / Packing Date', found, value: displayVal };
      })(),
      (() => {
        const { displayVal, found } = formatUseByDate(declMap.mfg_date);
        return { name: 'Use By / Best Before', found, value: displayVal };
      })(),
      {
        name: 'Manufacturer / Packer',
        found: Boolean(declMap.manufacturer_address && String(declMap.manufacturer_address).trim()),
        value: declMap.manufacturer_address ? String(declMap.manufacturer_address).trim() : 'Not detected',
      },
      (() => {
        const { displayVal, found } = formatConsumerCare(declMap.consumer_care);
        return { name: 'Consumer Care', found, value: displayVal };
      })(),
      {
        name: 'Country of Origin',
        found: Boolean(declMap.country_of_origin && String(declMap.country_of_origin).trim()),
        value: declMap.country_of_origin ? String(declMap.country_of_origin).trim() : 'Not detected',
        isConditional: importStatus !== 'imported',
        applicabilityNote:
          importStatus === 'unknown'
            ? 'Mandatory only for imported commodities. Import status is undetermined.'
            : importStatus === 'domestic'
            ? 'Not required for domestic commodities.'
            : undefined,
      },
      {
        name: 'Unit Sale Price',
        found: Boolean(declMap.unit_sale_price_text && String(declMap.unit_sale_price_text).trim()),
        value: declMap.unit_sale_price_text ? String(declMap.unit_sale_price_text).trim() : 'Not detected',
      },
    ];

    // Conditionally include dimensions if present on package
    const { displayVal: dimVal, found: dimFound } = formatDimensions(declMap.dimensions);
    if (dimFound) {
      items.push({
        name: 'Dimensions & Piece Count',
        found: dimFound,
        value: dimVal,
      });
    }

    return items;
  }

  // Defensive Fallback: If declarations are provided as a legacy array
  const complianceDecl = (result.compliance as Record<string, unknown> | undefined)?.declarations;
  if (Array.isArray(complianceDecl)) {
    return complianceDecl.map((d: Record<string, unknown>, idx: number) => ({
      name: (d.name as string) || `Declaration #${idx + 1}`,
      found: Boolean(d.found),
      value: (d.value as string) || (d.found ? 'Detected' : 'Not detected'),
    }));
  }

  return [];
}

/**
 * Detects import classification status explicitly from backend response structures.
 * Does NOT infer import status from OCR text, address, or heuristics.
 */
export function extractImportStatus(result?: ComplianceResult | null): ImportStatus {
  if (!result) return 'unknown';

  const res = result as Record<string, unknown>;
  const comp = result.compliance as Record<string, unknown> | undefined;
  const decl = result.declarations as Record<string, unknown> | undefined;
  const cat = decl?.category as Record<string, unknown> | undefined;
  const appRoot = res.applicability as Record<string, unknown> | undefined;
  const appComp = comp?.applicability as Record<string, unknown> | undefined;

  // 1. Check explicit import_status property in root, compliance, applicability, or declarations
  const explicitCandidates = [
    res.import_status,
    comp?.import_status,
    appRoot?.import_status,
    appComp?.import_status,
    decl?.import_status,
    cat?.import_status,
  ];

  for (const candidate of explicitCandidates) {
    if (typeof candidate === 'string') {
      const norm = candidate.trim().toLowerCase();
      if (norm === 'imported') return 'imported';
      if (norm === 'domestic') return 'domestic';
      if (norm === 'unknown') return 'unknown';
    }
  }

  // 2. Check explicit is_imported property in category, root, or applicability
  const isImportedCandidates = [
    cat?.is_imported,
    res.is_imported,
    appRoot?.is_imported,
    appComp?.is_imported,
  ];

  for (const candidate of isImportedCandidates) {
    if (typeof candidate === 'string') {
      const norm = candidate.trim().toLowerCase();
      if (norm === 'imported' || norm === 'true') return 'imported';
      if (norm === 'domestic' || norm === 'false') return 'domestic';
      if (norm === 'unknown') return 'unknown';
    }
    if (typeof candidate === 'boolean') {
      return candidate ? 'imported' : 'domestic';
    }
  }

  // If no explicit import status exists, it is undetermined/unknown
  return 'unknown';
}

/**
 * Checks if a violation code or field represents an imported-product-only requirement.
 */
export function isImportStatusDependentViolation(
  v: { code?: string; field?: string; message?: string }
): boolean {
  const code = String(v.code || '').trim().toUpperCase();
  const field = String(v.field || '').trim().toLowerCase();
  const msg = String(v.message || '').trim().toLowerCase();

  return (
    code === 'MISSING_COUNTRY_OF_ORIGIN' ||
    code === 'EC_MISSING_COO_FILTER' ||
    code.includes('COUNTRY_OF_ORIGIN') ||
    code.includes('IMPORTER') ||
    field === 'country_of_origin' ||
    field === 'importer' ||
    msg.includes('imported product')
  );
}

/**
 * Determines whether a violation finding represents an uncertain applicability condition
 * requiring administrative review rather than a confirmed violation.
 */
export function isApplicabilityReviewFlag(
  v: Record<string, unknown>,
  importStatus: ImportStatus
): boolean {
  // 1. Explicit applicability uncertainty declared on the violation itself
  const vApplicability = String(v.applicability || v.applicability_status || '').trim().toLowerCase();
  if (vApplicability === 'unknown' || vApplicability === 'requires_review' || vApplicability === 'review') {
    return true;
  }

  const vImportStatus = String(v.import_status || '').trim().toLowerCase();
  if (vImportStatus === 'unknown') {
    return true;
  }

  if (v.requires_review === true || v.is_applicable === 'unknown') {
    return true;
  }

  // 2. Import-status-dependent rule when import status is unknown
  if (importStatus === 'unknown' && isImportStatusDependentViolation(v as { code?: string; field?: string; message?: string })) {
    return true;
  }

  return false;
}

/**
 * Normalizes rule violations from result.compliance.violations and partitions them
 * into confirmed violations vs. applicability review flags.
 *
 * Prevents presenting uncertain import-status applicability as confirmed violations.
 */
export function extractComplianceFindings(
  result?: ComplianceResult | null
): NormalizedComplianceFindings {
  const importStatus = extractImportStatus(result);

  if (!result?.compliance?.violations || !Array.isArray(result.compliance.violations)) {
    return {
      confirmedViolations: [],
      reviewFlags: [],
      importStatus,
      hasReviewFlags: false,
      totalConfirmed: 0,
      totalReview: 0,
    };
  }

  const confirmedViolations: NormalizedViolation[] = [];
  const reviewFlags: NormalizedViolation[] = [];

  result.compliance.violations.forEach((v: Record<string, unknown>, idx: number) => {
    const rawCode = v.code || v.rule_id || v.rule || `VIOLATION_${idx + 1}`;
    const code = String(rawCode).trim().toUpperCase();

    const rawSeverity = String(v.severity || 'major').toLowerCase();
    let severity: ViolationSeverity = 'major';
    if (rawSeverity === 'critical') severity = 'critical';
    else if (rawSeverity === 'minor') severity = 'minor';

    const field = v.field ? String(v.field).trim() : 'general';
    const message = String(v.message || v.description || 'Statutory requirement not satisfied.').trim();

    const isReview = isApplicabilityReviewFlag(v, importStatus);

    if (isReview) {
      const isImportDependent = isImportStatusDependentViolation({ code, field, message });
      const reviewReason = isImportDependent
        ? 'Import status could not be determined from the available evidence.'
        : String(v.review_reason || v.reviewReason || 'Applicability requires administrative verification.');

      reviewFlags.push({
        code,
        severity,
        field,
        message,
        isReviewFlag: true,
        reviewReason,
      });
    } else {
      confirmedViolations.push({
        code,
        severity,
        field,
        message,
        isReviewFlag: false,
      });
    }
  });

  return {
    confirmedViolations,
    reviewFlags,
    importStatus,
    hasReviewFlags: reviewFlags.length > 0,
    totalConfirmed: confirmedViolations.length,
    totalReview: reviewFlags.length,
  };
}

/**
 * Normalizes rule violations from result.compliance.violations into confirmed violations only.
 * Excludes uncertain review flags to prevent false certainty.
 */
export function extractNormalizedViolations(
  result?: ComplianceResult | null
): NormalizedViolation[] {
  const findings = extractComplianceFindings(result);
  return findings.confirmedViolations;
}

/**
 * Normalizes rule violations into review flags only (items requiring applicability review).
 */
export function extractReviewFlags(
  result?: ComplianceResult | null
): NormalizedViolation[] {
  const findings = extractComplianceFindings(result);
  return findings.reviewFlags;
}

/**
 * Maps scan status and overall compliance status into UI badge variant and label.
 */
export function getComplianceBadgeVariant(
  overallStatus?: string | null,
  scanStatus?: string | null,
  options?: BadgeVariantOptions
): ComplianceBadgeInfo {
  const normScan = scanStatus?.toLowerCase();
  const normOverall = overallStatus?.toLowerCase();

  if (normScan === 'processing') {
    return { label: 'Processing Scan', variant: 'info' };
  }

  if (normScan === 'failed') {
    return {
      label: options?.detailed ? 'Audit Failed' : 'Verification Failed',
      variant: 'error',
    };
  }

  if (normOverall === 'compliant') {
    return {
      label: options?.detailed ? 'Fully Compliant' : 'Compliant',
      variant: 'success',
    };
  }

  if (normOverall === 'non_compliant') {
    return {
      label: 'Non-Compliant',
      variant: 'error',
    };
  }

  return {
    label: options?.detailed ? 'Pending Evaluation' : 'Pending Result',
    variant: 'warning',
  };
}

/**
 * Returns consolidated screening result badge variant and label for inspection tables and lists.
 * Distinguishes:
 * - 'COMPLIANT — REVIEW REQUIRED'
 * - 'NON-COMPLIANT — REVIEW REQUIRED'
 * - 'VERIFICATION FAILED'
 * - 'AI Screening in Progress'
 * - 'Pending Evaluation'
 */
export function getScreeningResultBadge(
  overallStatus?: string | null,
  scanStatus?: string | null
): ComplianceBadgeInfo {
  const normScan = scanStatus?.toLowerCase();
  const normOverall = overallStatus?.toLowerCase();

  if (normScan === 'processing') {
    return {
      label: 'AI Screening in Progress',
      variant: 'info',
    };
  }

  if (normScan === 'failed') {
    return {
      label: 'VERIFICATION FAILED',
      variant: 'error',
    };
  }

  if (normOverall === 'compliant') {
    return {
      label: 'COMPLIANT — REVIEW REQUIRED',
      variant: 'success',
    };
  }

  if (normOverall === 'non_compliant') {
    return {
      label: 'NON-COMPLIANT — REVIEW REQUIRED',
      variant: 'error',
    };
  }

  return {
    label: 'Pending Evaluation',
    variant: 'warning',
  };
}

