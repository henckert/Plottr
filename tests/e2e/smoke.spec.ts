import { test, expect } from '@playwright/test';

/**
 * E2E Smoke Tests - API Health Checks
 * Validates backend API is running and responding
 */

test.describe('API Smoke Tests', () => {
  test('backend health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('ok', true);
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
  });

  test('API documentation is accessible', async ({ request }) => {
    const response = await request.get('/api/docs');
    expect(response.status()).toBe(200);
    
    const html = await response.text();
    expect(html).toContain('swagger-ui');
    expect(html).toContain('Plottr API');
  });

  test('OpenAPI spec is valid JSON', async ({ request }) => {
    const response = await request.get('/api/openapi.json');
    expect(response.status()).toBe(200);
    
    const spec = await response.json();
    expect(spec).toHaveProperty('openapi', '3.0.3');
    expect(spec).toHaveProperty('info');
    expect(spec.info).toHaveProperty('title', 'Plottr API');
    expect(spec).toHaveProperty('paths');
  });
});
