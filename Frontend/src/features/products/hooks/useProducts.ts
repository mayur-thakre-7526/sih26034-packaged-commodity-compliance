import { useState, useEffect, useCallback, useRef } from 'react';
import { productsService } from '../services/productsService';
import type { Product, ProductFilters } from '../types';
import type { ApiError } from '@/types/api';

/**
 * Hook for managing the product catalog and search filtering.
 */
export function useProducts(initialFilters?: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(initialFilters?.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters?.search || '');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 350);
  }, []);

  const handleResetSearch = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await productsService.getProducts({
        search: debouncedSearch,
      });
      setProducts(data);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      setError(
        apiError.message ||
          'Failed to retrieve product records. Please check network connectivity and backend status.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    let isCancelled = false;

    productsService
      .getProducts({
        search: debouncedSearch,
      })
      .then((data) => {
        if (!isCancelled) {
          setProducts(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const apiError = err as ApiError;
          setError(
            apiError.message ||
              'Failed to retrieve product records. Please check network connectivity and backend status.'
          );
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    products,
    isLoading,
    error,
    search: searchInput,
    setSearch: handleSearchChange,
    resetSearch: handleResetSearch,
    refetch: fetchProducts,
  };
}

export default useProducts;
