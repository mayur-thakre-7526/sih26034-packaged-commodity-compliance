import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { InspectionFilters } from '../types';

export interface InspectionsFilterProps {
  search: string;
  status: InspectionFilters['status'];
  onSearchChange: (search: string) => void;
  onStatusChange: (status: InspectionFilters['status']) => void;
  onReset: () => void;
  disabled?: boolean;
}

const statusOptions: SelectOption[] = [
  { value: '', label: 'All Compliance Statuses' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'non_compliant', label: 'Non-Compliant' },
];

export function InspectionsFilter({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onReset,
  disabled = false,
}: InspectionsFilterProps) {
  const hasActiveFilters = Boolean(search.trim() || status);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        {/* Search by Product or Brand */}
        <div className="sm:col-span-6 lg:col-span-6">
          <Input
            id="inspections-search"
            label="Search Commodity / Brand"
            placeholder="Search by product name or brand..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
            leftElement={<Search className="h-4 w-4 text-slate-400" />}
          />
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-4 lg:col-span-4">
          <Select
            id="inspections-status-filter"
            label="Compliance Status"
            options={statusOptions}
            value={status || ''}
            onChange={(e) => onStatusChange(e.target.value as InspectionFilters['status'])}
            disabled={disabled}
          />
        </div>

        {/* Reset Action / Real-time Filter Indicator */}
        <div className="sm:col-span-2 lg:col-span-2 flex items-center justify-end sm:justify-start">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onReset}
              disabled={disabled}
              className="w-full text-slate-600 hover:text-slate-900 border-slate-200"
              leftIcon={<X className="h-4 w-4" />}
              aria-label="Clear active filters"
              title="Clear active search and compliance status filters"
            >
              Clear
            </Button>
          )}
          {!hasActiveFilters && (
            <div
              className="hidden sm:flex items-center text-xs text-slate-400 gap-1.5 h-10 px-2 select-none"
              title="Filters are updated in real time"
            >
              <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Real-time</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InspectionsFilter;
