import { Search, X, Package } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface ProductsFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ProductsFilter({
  search,
  onSearchChange,
  onReset,
  disabled = false,
}: ProductsFilterProps) {
  const hasActiveSearch = Boolean(search.trim());

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            id="products-search"
            label="Search Regulated Commodities"
            placeholder="Search by commodity name or manufacturer brand..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
            leftElement={<Search className="h-4 w-4 text-slate-400" aria-hidden="true" />}
          />
        </div>

        <div className="w-full sm:w-auto flex items-end self-end h-10">
          {hasActiveSearch && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onReset}
              disabled={disabled}
              className="w-full sm:w-auto text-slate-600 hover:text-slate-900 border-slate-200"
              leftIcon={<X className="h-4 w-4" />}
              aria-label="Clear active search"
              title="Clear active commodity search"
            >
              Clear
            </Button>
          )}
          {!hasActiveSearch && (
            <div
              className="hidden sm:flex items-center text-xs text-slate-400 gap-1.5 h-10 px-2 select-none"
              title="Catalog searches are executed in real time against the backend database"
            >
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Real-time catalog search</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductsFilter;
