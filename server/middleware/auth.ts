import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

const supabase = env.supabaseUrl && env.supabaseServiceRoleKey
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
  : null;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: 'free' | 'premium';
  };
}

/**
 * Middleware to require authentication
 * Extracts JWT token from Authorization header and validates with Supabase
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!supabase) {
    res.status(503).json({ error: 'Authentication service unavailable' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Get user's subscription tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email || '',
      tier: (subscription?.tier as 'free' | 'premium') || 'free',
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication middleware
 * Adds user to request if token is present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!supabase) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email || '',
        tier: (subscription?.tier as 'free' | 'premium') || 'free',
      };
    }
  } catch (err) {
    // Silently fail for optional auth
    console.warn('Optional auth error:', err);
  }

  next();
}
