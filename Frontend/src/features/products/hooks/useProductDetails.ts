import { useState, useCallback } from 'react';
import { productsService } from '../services/productsService';
import type { Product } from '../types';
import type { ApiError } from '@/types/api';

/**
 * Hook for managing single product detail retrieval by ID.
 */
export function useProductDetails() {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await productsService.getProductById(id);
      setProduct(data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to retrieve product details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearProduct = useCallback(() => {
    setProduct(null);
    setError(null);
  }, []);

  return {
    product,
    isLoading,
    error,
    fetchProduct,
    clearProduct,
  };
}

export default useProductDetails;
