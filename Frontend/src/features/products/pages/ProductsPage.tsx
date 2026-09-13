import { useState } from 'react';
import { RefreshCw, Package, Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProducts } from '../hooks/useProducts';
import { ProductsFilter } from '../components/ProductsFilter';
import { ProductsTable } from '../components/ProductsTable';
import { ProductsSkeleton } from '../components/ProductsSkeleton';
import { ProductDetailsModal } from '../components/ProductDetailsModal';
import { CreateProductModal } from '../components/CreateProductModal';

export function ProductsPage() {
  const { products, isLoading, error, search, setSearch, resetSearch, refetch } =
    useProducts();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const hasActiveSearch = Boolean(search.trim());

  const handleViewDetails = (id: string) => {
    setSelectedProductId(id);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedProductId(null);
  };

  return (
    <PageContainer
      title="Regulated Commodity Catalog"
      description="Official Legal Metrology directory of registered packaged commodities, brand identities, and standard generic classifications"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            aria-label="Refresh product catalog"
          >
            Refresh Catalog
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            aria-label="Register new packaged commodity"
          >
            Register Commodity
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Real-time Product & Brand Search */}
        <ProductsFilter
          search={search}
          onSearchChange={setSearch}
          onReset={resetSearch}
          disabled={isLoading && products.length === 0}
        />

        {/* Loading Skeleton */}
        {isLoading && products.length === 0 && <ProductsSkeleton />}

        {/* Error State with Retry */}
        {error && products.length === 0 && (
          <ErrorState
            title="Unable to Load Product Records"
            message={error}
            retryAction={refetch}
            retryLabel="Retry Connection"
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && products.length === 0 && (
          <EmptyState
            title={hasActiveSearch ? 'No Matching Commodities' : 'No Commodities Registered'}
            description={
              hasActiveSearch
                ? 'No registered commodities matched your search query. Try searching with a different product or brand name.'
                : 'There are currently no regulated packaged commodities recorded in the database.'
            }
            icon={<Package className="h-6 w-6 text-slate-400" />}
            action={
              hasActiveSearch ? (
                <Button variant="outline" size="sm" onClick={resetSearch}>
                  Clear Search
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Register First Commodity
                </Button>
              )
            }
          />
        )}

        {/* Populated Live Products Table */}
        {products.length > 0 && (
          <ProductsTable
            products={products}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={isDetailsOpen}
        productId={selectedProductId}
        onClose={handleCloseDetails}
      />

      {/* Create / Register Product Modal */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={refetch}
      />
    </PageContainer>
  );
}

export default ProductsPage;
