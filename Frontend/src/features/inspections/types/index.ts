/**
 * Inspection / Scan status enumeration.
 */
export type ScanStatus = 'processing' | 'completed' | 'failed';

/**
 * Overall compliance evaluation status.
 */
export type ComplianceOverallStatus = 'compliant' | 'non_compliant';

/**
 * Violation severity levels straight from Legal Metrology compliance rules.
 */
export type ViolationSeverity = 'critical' | 'major' | 'minor';

/**
 * Inspection item returned by the GET /api/scans list endpoint.
 */
export interface InspectionListItem {
  id: string;
  product_id: string;
  product_name?: string;
  brand_name?: string;
  status: ScanStatus | string;
  overall_status: ComplianceOverallStatus | null;
  created_at: string;
  critical?: number;
  major?: number;
  minor?: number;
  violationsCount?: number;
}

/**
 * Net Quantity declaration extracted by image processing & OCR.
 */
export interface ExtractedNetQuantity {
  value?: number | null;
  unit?: string | null;
  raw_text?: string | null;
  is_qualified?: boolean;
}

/**
 * Maximum Retail Price (MRP) declaration extracted by OCR.
 */
export interface ExtractedMRP {
  value?: number | null;
  raw_text?: string | null;
  has_tax_statement?: boolean;
  all_detected_values?: number[];
  font_height_mm?: number | null;
  is_sticker?: boolean;
}

/**
 * Manufacturing and best before date declarations.
 */
export interface ExtractedDate {
  manufacture_month_year?: string | null;
  best_before_text?: string | null;
  font_height_mm?: number | null;
}

/**
 * Consumer care / customer support contact details.
 */
export interface ExtractedConsumerCare {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Package dimension and piece count declarations.
 */
export interface ExtractedDimensions {
  num_pieces?: number | null;
  per_piece_dimensions?: string[];
}

/**
 * Product category and statutory rule exemptions.
 */
export interface ExtractedCategory {
  is_imported?: boolean;
  is_textile_item?: boolean;
  can_expire?: boolean;
  is_exempt_from_mfg_date?: boolean;
  is_exempt_from_mrp?: boolean;
  is_combination_or_group_pack?: boolean;
  is_multi_piece_count_pack?: boolean;
}

/**
 * Actual declarations dictionary returned by the Python compliance service.
 */
export interface ExtractedDeclarations {
  generic_name?: string | null;
  manufacturer_address?: string | null;
  country_of_origin?: string | null;
  net_quantity?: ExtractedNetQuantity | null;
  mrp?: ExtractedMRP | null;
  mfg_date?: ExtractedDate | null;
  consumer_care?: ExtractedConsumerCare | null;
  dimensions?: ExtractedDimensions | null;
  unit_sale_price_text?: string | null;
  category?: ExtractedCategory | null;
  pdp_area_cm2?: number | null;
  general_letter_height_mm?: number | null;
  is_embossed_or_perforated?: boolean;
  is_ecommerce_listing?: boolean;
  [key: string]: unknown;
}

/**
 * Aggregated compliance summary metrics.
 */
export interface ComplianceSummary {
  overall_status: ComplianceOverallStatus | string;
  critical: number;
  major: number;
  minor: number;
  [key: string]: unknown;
}

/**
 * Specific regulatory violation item returned by rule engine.
 */
export interface ViolationItem {
  code: string;
  severity: ViolationSeverity | string;
  field: string;
  message: string;
  rule_id?: string;
  rule?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Complete compliance report structure from Python rule engine.
 */
export interface ComplianceReport {
  summary: ComplianceSummary;
  violations: ViolationItem[];
  declarations?: unknown;
  [key: string]: unknown;
}

/**
 * Calibration metadata produced during computer vision analysis.
 */
export interface ComplianceCalibration {
  method?: string;
  px_per_mm?: number | null;
  [key: string]: unknown;
}

/**
 * Structured compliance result payload returned by backend image processing.
 */
export interface ComplianceResult {
  scan_id?: string;
  processing_ms?: number;
  quality_flags?: string[];
  calibration?: ComplianceCalibration;
  declarations?: ExtractedDeclarations | Record<string, unknown>;
  compliance?: ComplianceReport;
  [key: string]: unknown;
}

/**
 * Import classification status of the inspected commodity.
 */
export type ImportStatus = 'imported' | 'domestic' | 'unknown';

/**
 * Normalized statutory declaration representation for UI presentation.
 */
export interface NormalizedDeclaration {
  name: string;
  found: boolean;
  value: string;
  isConditional?: boolean;
  applicabilityNote?: string;
}

/**
 * Normalized violation representation for UI presentation.
 */
export interface NormalizedViolation {
  code: string;
  severity: ViolationSeverity;
  field: string;
  message: string;
  isReviewFlag?: boolean;
  reviewReason?: string;
}

/**
 * Complete normalized compliance findings separating confirmed violations from review flags.
 */
export interface NormalizedComplianceFindings {
  confirmedViolations: NormalizedViolation[];
  reviewFlags: NormalizedViolation[];
  importStatus: ImportStatus;
  hasReviewFlags: boolean;
  totalConfirmed: number;
  totalReview: number;
}

/**
 * Legacy declaration item interface retained for backward compatibility.
 */
export interface DeclarationItem {
  name?: string;
  found?: boolean;
  value?: string;
  rule?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Full detailed inspection entity returned by GET /api/scans/:id.
 */
export interface InspectionDetail {
  id: string;
  product_id: string;
  user_id?: string;
  image_urls?: string[];
  status: ScanStatus | string;
  result?: ComplianceResult;
  created_at: string;
}

/**
 * Filter criteria supported by the backend GET /api/scans endpoint.
 */
export interface InspectionFilters {
  search?: string;
  status?: ComplianceOverallStatus | '';
}

/**
 * Payload for initiating a new commodity compliance scan via POST /api/scans.
 */
export interface CreateScanPayload {
  product_id: string;
  images: File[];
}
