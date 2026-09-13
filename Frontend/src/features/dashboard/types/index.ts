/**
 * Violation count distribution categorized by severity.
 */
export interface ViolationCounts {
  critical: number;
  major: number;
  minor: number;
}

/**
 * Inspection activity statistics for an individual day.
 */
export interface ActivityDay {
  date: string;
  day?: string;
  count?: number;
  inspections?: number;
  compliant?: number;
  nonCompliant?: number;
}

/**
 * Summary record of a recently completed or ongoing inspection.
 */
export interface RecentInspection {
  id: string | number;
  productName?: string;
  productCode?: string;
  batchNumber?: string;
  status: 'compliant' | 'non_compliant' | 'passed' | 'failed' | 'pending' | 'in_progress' | string;
  createdAt?: string;
  date?: string;
  inspectorName?: string;
  violationsCount?: number;
  [key: string]: unknown;
}

/**
 * Comprehensive dashboard response payload matching GET /api/dashboard.
 */
export interface DashboardData {
  totalInspections: number;
  compliantInspections: number;
  nonCompliantInspections: number;
  totalProducts: number;
  criticalViolations?: number;
  majorViolations?: number;
  minorViolations?: number;
  violations?: ViolationCounts;
  recentInspections: RecentInspection[];
  last7DaysActivity: ActivityDay[];
  [key: string]: unknown;
}
