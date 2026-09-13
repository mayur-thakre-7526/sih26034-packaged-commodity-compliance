/**
 * Product commodity entity matching backend database schema.
 */
export interface Product {
  id: string;
  product_name: string;
  brand_name: string;
  generic_name: string;
  created_at: string;
}

/**
 * Payload required for registering a new product via POST /api/products.
 */
export interface CreateProductInput {
  product_name: string;
  brand_name: string;
  generic_name: string;
}

/**
 * Filter criteria supported by GET /api/products?search=...
 */
export interface ProductFilters {
  search?: string;
}
