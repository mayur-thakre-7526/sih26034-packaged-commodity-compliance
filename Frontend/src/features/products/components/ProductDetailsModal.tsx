import { useEffect } from 'react';
import { Package, Tag, Building2, Calendar, Hash, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { useProductDetails } from '../hooks/useProductDetails';

export interface ProductDetailsModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailsModal({
  productId,
  isOpen,
  onClose,
}: ProductDetailsModalProps) {
  const { product, isLoading, error, fetchProduct, clearProduct } = useProductDetails();

  useEffect(() => {
    if (isOpen && productId) {
      fetchProduct(productId);
    } else if (!isOpen) {
      clearProduct();
    }
  }, [isOpen, productId, fetchProduct, clearProduct]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold text-slate-900">
            Product Commodity Profile
          </span>
          {product && (
            <span
              className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
              title={product.id}
            >
              #{product.id.slice(0, 8)}
            </span>
          )}
        </div>
      }
      description="Registered packaged commodity specifications and regulatory metadata under Legal Metrology Rules"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-200 text-slate-700"
            aria-label="Close product details dialog"
          >
            Close
          </Button>
        </div>
      }
    >
      {/* Loading State */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Spinner size="lg" className="text-blue-700 mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading commodity specifications...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving product record from database</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="Could Not Retrieve Product"
          message={error}
          retryAction={() => productId && fetchProduct(productId)}
          retryLabel="Retry"
        />
      )}

      {/* Populated Product Data */}
      {product && !isLoading && (
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Package className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate" title={product.product_name}>
                  {product.product_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate" title={product.brand_name}>
                  Brand: <span className="text-slate-800 font-semibold">{product.brand_name}</span>
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full truncate"
                    title={product.generic_name}
                  >
                    <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{product.generic_name}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Field Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                Brand Manufacturer / Identity
              </span>
              <p className="text-sm font-semibold text-slate-900 break-words">
                {product.brand_name}
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                Generic Commodity Classification
              </span>
              <p className="text-sm font-semibold text-slate-900 break-words">
                {product.generic_name}
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                Registration Timestamp
              </span>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(product.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                Database Primary Key
              </span>
              <p className="text-xs font-mono font-medium text-slate-700 truncate" title={product.id}>
                {product.id}
              </p>
            </div>
          </div>

          {/* Statutory Verification Context */}
          <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-blue-900">
              <span className="font-semibold block">Legal Metrology Packaged Commodities Verification</span>
              <p className="mt-0.5 text-blue-800 leading-relaxed">
                This registered commodity profile is referenced during scanner image audits to cross-examine mandatory package declarations (MRP, Net Quantity, Best Before, and Manufacturer identity).
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default ProductDetailsModal;
