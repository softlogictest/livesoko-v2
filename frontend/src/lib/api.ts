import { AppState } from '../types';

// API base URL — use relative paths for everything (standard PWA/Vite practice)
export const API = import.meta.env.VITE_API_URL || '';

/**
 * Enhanced fetch wrapper that:
 * 1. Automatically adds the Bearer token
 * 2. Automatically adds x-shop-id header
 * 3. Handles 401 Unauthorized by clearing local session
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('livesoko_token');
  const shopId = localStorage.getItem('livesoko_shop_id');
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (shopId) {
    headers.set('x-shop-id', shopId);
  }
  
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    // Session expired or invalid
    const data = await response.clone().json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED' || data.code === 'UNAUTHORIZED' || response.status === 401) {
      localStorage.removeItem('livesoko_token');
      window.dispatchEvent(new CustomEvent('auth-error'));
    }
  }

  // Handle billing lockouts
  if (response.status === 402) {
    window.dispatchEvent(new CustomEvent('billing-error'));
  }

  return response;
}
