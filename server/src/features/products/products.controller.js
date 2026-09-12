import { supabase } from '../../config/supabase.js';

export const createProduct = async (req, res, next) => {
  try {
    const { product_name, brand_name, generic_name } = req.body;

    if (!product_name || !brand_name || !generic_name) {
      const error = new Error('product_name, brand_name, and generic_name are required');
      error.statusCode = 400;
      throw error;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({ product_name, brand_name, generic_name })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const { search } = req.query;
    
    let query = supabase.from('products').select('*');
    
    if (search) {
      // Search by product_name or brand_name case-insensitively
      query = query.or(`product_name.ilike.%${search}%,brand_name.ilike.%${search}%`);
    }

    // Order by creation date descending
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      const err = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};
