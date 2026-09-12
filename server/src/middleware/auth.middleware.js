import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { supabase } from '../config/supabase.js';

// Setup JWKS client using Supabase's JWKS URL
const client = jwksClient({
  jwksUri: process.env.SUPABASE_JWKS_URL
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT locally using JWKS
  jwt.verify(token, getKey, { algorithms: ['RS256', 'ES256'] }, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
      // The `sub` claim contains the Supabase user ID
      const userId = decoded.sub;

      // Fetch application user from our database table
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'User not found in database' });
      }

      if (user.is_active === false) {
        return res.status(403).json({ error: 'User account is inactive' });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (dbError) {
      next(dbError);
    }
  });
};
