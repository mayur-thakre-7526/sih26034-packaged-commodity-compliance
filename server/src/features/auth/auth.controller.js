import { supabase } from '../../config/supabase.js';
import { createClient } from '@supabase/supabase-js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Authenticate with Supabase using an isolated client so the global admin client is not polluted
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Return the session/token needed by the frontend/mobile client
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = (req, res) => {
  // req.user is populated by the requireAuth middleware
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    is_active: req.user.is_active,
    created_at: req.user.created_at
  });
};
