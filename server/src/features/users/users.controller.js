import { supabase } from '../../config/supabase.js';

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (role !== 'inspector' && role !== 'admin') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // 1. Create the user in Supabase Auth using the Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // 2. Insert the application user record into our custom users table
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        name,
        email,
        role,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      // In a real application, you might want to rollback the auth user creation here
      return res.status(500).json({ error: 'Failed to create user record in database' });
    }

    res.status(201).json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      is_active: userData.is_active
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    // 1. Update the database record
    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select('id, name, email, role, is_active')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'User not found or update failed' });
    }

    // 2. Optionally, disable the user in Supabase Auth to prevent new token issuance
    // If is_active is false, we ban them for a long time. If true, unban.
    const banDuration = is_active ? 'none' : '876000h'; // 100 years
    await supabase.auth.admin.updateUserById(id, { ban_duration: banDuration });

    res.json(data);
  } catch (error) {
    next(error);
  }
};
