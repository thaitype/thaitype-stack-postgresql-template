/**
 * Shared Authentication Types
 * 
 * Centralized authentication data structures for simplified admin-only system.
 */

import type { User } from '~/server/domain/models';

/**
 * Session data structure used in authentication contexts
 * Represents runtime session information
 */
export interface SessionData {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
}

/**
 * PAT data structure used in authentication contexts
 * Represents runtime PAT information (subset of domain PersonalAccessToken)
 */
export interface PatData {
  id: string;
  name: string;
  permissions: string[];
}

/**
 * Base authentication context for admin users
 */
export interface BaseAuthContext {
  user: User;
}

/**
 * Session-only authentication context
 */
export interface SessionAuthContext extends BaseAuthContext {
  session: SessionData;
}

/**
 * Authentication result for admin operations
 */
export interface AuthResult {
  user: User;
  sessionData?: SessionData;
}

/**
 * Detailed authentication failure result
 */
export interface AuthFailureResult {
  error: 'no_session' | 'user_not_found' | 'auth_error' | 'no_pat_token' | 'invalid_pat_format' | 'invalid_pat_token' | 'unauthorized';
  message: string;
  details?: string;
}

/**
 * Authentication strategy configuration
 */
export interface AuthConfig {
  allowSession?: boolean;
  allowPat?: boolean;
  required?: boolean;
}

/**
 * Session authentication result with detailed status
 */
export interface SessionAuthDetailedResult {
  success: true;
  user: User;
  sessionData: SessionData;
}

export interface SessionAuthFailureResult {
  success: false;
  error: 'no_session' | 'user_not_found' | 'auth_error';
  message: string;
}

export type SessionAuthResult = SessionAuthDetailedResult | SessionAuthFailureResult;