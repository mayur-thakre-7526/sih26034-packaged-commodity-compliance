import { useState, useMemo } from 'react';
import {
  Eye,
  Tag,
  Calendar,
  Package,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Product } from '../types';

export interface ProductsTableProps {
  products: Product[];
  onViewDetails: (id: string) => void;
}

const PAGE_SIZE = 10;

function formatProductDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function ProductsTable({ products, onViewDetails }: ProductsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Automatically reset to page 1 whenever the dataset reference changes (e.g. search, clear, reload)
  const [prevProducts, setPrevProducts] = useState(products);
  if (products !== prevProducts) {
    setPrevProducts(products);
    setCurrentPage(1);
  }

  const totalRecords = products.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRecords);

  const currentRecords = useMemo(
    () => products.slice(startIndex, endIndex),
    [products, startIndex, endIndex]
  );

  const rangeText =
    totalRecords === 0
      ? 'Showing 0 of 0 products'
      : startIndex + 1 === endIndex
      ? `Showing ${startIndex + 1} of ${totalRecords} ${
          totalRecords === 1 ? 'product' : 'products'
        }`
      : `Showing ${startIndex + 1}–${endIndex} of ${totalRecords} products`;

  return (
    <Card className="overflow-hidden shadow-xs border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">
            Regulated Commodities Catalog
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Registered packaged commodities, brand identities, and standard generic classifications
          </CardDescription>
        </div>
        <Badge variant="neutral" size="sm">
          {totalRecords} {totalRecords === 1 ? 'Product' : 'Products'}
        </Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-6">Product ID</th>
              <th scope="col" className="py-3.5 px-6">Commodity Name</th>
              <th scope="col" className="py-3.5 px-6">Brand Identity</th>
              <th scope="col" className="py-3.5 px-6">Generic Classification</th>
              <th scope="col" className="py-3.5 px-6">Registered On</th>
              <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {currentRecords.map((item) => {
              const formattedDate = formatProductDate(item.created_at);
              const shortId = item.id.length > 8 ? `${item.id.slice(0, 8)}...` : item.id;

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Product ID */}
                  <td className="py-3.5 px-6 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5" title={item.id}>
                      <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      #{shortId}
                    </span>
                  </td>

                  {/* Product Name */}
                  <td className="py-3.5 px-6">
                    <div className="max-w-xs sm:max-w-sm">
                      <p
                        className="font-semibold text-slate-900 leading-tight truncate"
                        title={item.product_name}
                      >
                        {item.product_name}
                      </p>
                    </div>
                  </td>

                  {/* Brand Name */}
                  <td className="py-3.5 px-6">
                    <div className="max-w-xs">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 truncate"
                        title={item.brand_name}
                      >
                        <Building2 className="h-3 w-3 text-slate-500 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.brand_name}</span>
                      </span>
                    </div>
                  </td>

                  {/* Generic Name */}
                  <td className="py-3.5 px-6">
                    <div className="max-w-xs">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 truncate"
                        title={item.generic_name}
                      >
                        <Tag className="h-3 w-3 text-blue-600 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.generic_name}</span>
                      </span>
                    </div>
                  </td>

                  {/* Registered Date */}
                  <td className="py-3.5 px-6 text-xs text-slate-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{formattedDate}</span>
                    </span>
                  </td>

                  {/* View Details Action */}
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(item.id)}
                      className="border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 shadow-2xs"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      aria-label={`View commodity specifications for ${item.product_name}`}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>

      {/* Pagination Controls Footer */}
      {totalRecords > 0 && (
        <div className="border-t border-slate-200/90 bg-slate-50/50 py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-600 font-medium">
            {rangeText}
          </p>

          <nav aria-label="Products table pagination" className="flex items-center gap-1.5 flex-wrap justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              leftIcon={<ChevronsLeft className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to first page"
            >
              First
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to previous page"
            >
              Previous
            </Button>

            <span className="text-xs text-slate-700 font-medium px-2">
              Page <span className="font-bold text-slate-900">{safeCurrentPage}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to next page"
            >
              Next
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              rightIcon={<ChevronsRight className="h-3.5 w-3.5" />}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              aria-label="Go to last page"
            >
              Last
            </Button>
          </nav>
        </div>
      )}
    </Card>
  );
}

export default ProductsTable;
