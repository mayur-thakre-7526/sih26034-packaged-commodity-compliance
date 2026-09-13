import type {
  InspectionListItem,
  InspectionDetail,
  InspectionFilters,
  ComplianceOverallStatus,
  ScanStatus,
} from '@/features/inspections';

/**
 * Report entry backed by the unified scan inspection record.
 */
export type ReportItem = InspectionListItem;

/**
 * Detailed report metadata and full compliance analysis.
 */
export type ReportDetail = InspectionDetail;

/**
 * Filters supported for compliance report retrieval.
 */
export type ReportFilters = InspectionFilters;

export type { ComplianceOverallStatus, ScanStatus };
