/**
 * Type-safe API client generated from OpenAPI specification
 * Provides full TypeScript autocomplete for all Plottr API endpoints
 */

import createClient from 'openapi-fetch';
import type { paths } from '@/types/api';

const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Add authentication token to all requests
 */
apiClient.use({
  async onRequest(req) {
    // Get token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        req.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return req;
  },
});

/**
 * Log all API errors in development
 */
if (process.env.NODE_ENV === 'development') {
  apiClient.use({
    async onResponse(res) {
      if (!res.ok) {
        console.error('API Error:', {
          status: res.status,
          url: res.url,
          body: await res.clone().text(),
        });
      }
      return res;
    },
  });
}

export default apiClient;
