import { AppState } from '../types';

// API base URL — same origin in production, localhost in development
export const API = import.meta.env.PROD 
  ? '' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

/**
 * Enhanced fetch wrapper that:
 * 1. Automatically adds the Bearer token
 * 2. Checks for X-Token-Renewed header and updates localStorage
 * 3. Handles 401 Unauthorized by clearing local session
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('dukalive_token');
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers
  });

  // Handle silent token renewal
  const renewedToken = response.headers.get('X-Token-Renewed');
  if (renewedToken && renewedToken !== 'true') {
     // If the header contains the actual new token string (if we decide to send it there)
     // Or if we just want to signal renewal and get it from elsewhere.
     // Current backend sets it to "true" and updates the DB, 
     // but the token string ITSELF doesn't change in our current simple implementation.
     // If we ever rotate tokens, we'd handle it here.
  }

  if (response.status === 401) {
    // Session expired or invalid
    const data = await response.clone().json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED' || data.code === 'UNAUTHORIZED') {
      localStorage.removeItem('dukalive_token');
      // We don't want to force a reload here, but the next ProtectedRoute check will catch it
    }
  }

  return response;
}
