import apiClient from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Product, CreateProductInput, ProductFilters } from '../types';
import type { ApiResponse } from '@/types/api';

/**
 * Service for product catalog interactions against SIH26034 backend.
 */
export const productsService = {
  /**
   * Fetches products with optional case-insensitive search parameter.
   * Calls GET /api/products?search=...
   */
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const params: Record<string, string> = {};

    if (filters?.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    const response = await apiClient.get<ApiResponse<Product[]> | Product[]>(
      ENDPOINTS.products.base,
      { params }
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && Array.isArray(body.data)) {
      return body.data as Product[];
    }

    if (Array.isArray(body)) {
      return body;
    }

    return [];
  },

  /**
   * Fetches single product details by product ID.
   * Calls GET /api/products/:id
   */
  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product> | Product>(
      ENDPOINTS.products.byId(id)
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as Product;
    }

    return body as Product;
  },

  /**
   * Registers a new regulated commodity.
   * Calls POST /api/products
   */
  async createProduct(input: CreateProductInput): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product> | Product>(
      ENDPOINTS.products.base,
      input
    );

    const body = response.data;

    if (body && typeof body === 'object' && 'data' in body && body.data) {
      return body.data as Product;
    }

    return body as Product;
  },
};

export default productsService;
