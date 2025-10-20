import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Sites & Layouts CRUD Workflow
 * Tests complete workflow: Create Site → Layout with real API calls
 */

test.describe('Sites & Layouts E2E Workflow', () => {
  let siteId: number;
  let layoutId: number;
  let siteVersionToken: string;
  let layoutVersionToken: string;
  let testClubId: number;

  test.beforeAll(async ({ request }) => {
    // Seed test club for E2E
    const seedResponse = await request.post('/api/test/seed');
    expect(seedResponse.status()).toBe(200);
    const seedData = await seedResponse.json();
    testClubId = seedData.clubId;
  });

  test('1. Create a new site', async ({ request }) => {
    const response = await request.post('/api/sites', {
      data: {
        club_id: testClubId,
        name: 'E2E Test Stadium',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'US',
        location: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749], // San Francisco
        },
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('name', 'E2E Test Stadium');
    expect(body.data).toHaveProperty('club_id', testClubId);
    expect(body.data).toHaveProperty('version_token');

    siteId = body.data.id;
    siteVersionToken = body.data.version_token;
  });

  test('2. Retrieve the created site', async ({ request }) => {
    const response = await request.get(`/api/sites/${siteId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveProperty('id', siteId);
    expect(body.data).toHaveProperty('name', 'E2E Test Stadium');
    expect(body.data.location).toHaveProperty('type', 'Point');
  });

  test('3. Update the site', async ({ request }) => {
    const response = await request.put(`/api/sites/${siteId}`, {
      headers: {
        'If-Match': siteVersionToken,
      },
      data: {
        name: 'E2E Updated Stadium',
        address: '456 Updated Ave',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('name', 'E2E Updated Stadium');
    expect(body.data).toHaveProperty('address', '456 Updated Ave');
    expect(body.data.version_token).not.toBe(siteVersionToken);
    
    siteVersionToken = body.data.version_token;
  });

  test('4. Create a layout for the site', async ({ request }) => {
    const response = await request.post('/api/layouts', {
      data: {
        site_id: siteId,
        name: 'E2E Test Layout',
        description: 'Test layout for E2E testing',
        boundary: {
          type: 'Polygon',
          coordinates: [[
            [-122.4194, 37.7749],
            [-122.4184, 37.7749],
            [-122.4184, 37.7739],
            [-122.4194, 37.7739],
            [-122.4194, 37.7749],
          ]],
        },
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('name', 'E2E Test Layout');
    expect(body.data).toHaveProperty('site_id', siteId);
    expect(body.data).toHaveProperty('version_token');

    layoutId = body.data.id;
    layoutVersionToken = body.data.version_token;
  });

  test('5. List layouts for the site', async ({ request }) => {
    const response = await request.get(`/api/layouts?site_id=${siteId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    
    const layout = body.data.find((l: any) => l.id === layoutId);
    expect(layout).toBeDefined();
    expect(layout.name).toBe('E2E Test Layout');
  });

  test('6. Update the layout', async ({ request }) => {
    const response = await request.put(`/api/layouts/${layoutId}`, {
      headers: {
        'If-Match': layoutVersionToken,
      },
      data: {
        name: 'E2E Updated Layout',
        description: 'Updated description',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('name', 'E2E Updated Layout');
    expect(body.data).toHaveProperty('description', 'Updated description');
    expect(body.data.version_token).not.toBe(layoutVersionToken);

    layoutVersionToken = body.data.version_token;
  });

  test('7. Test version conflict on concurrent update', async ({ request }) => {
    // Try to update with stale version token
    const response = await request.put(`/api/layouts/${layoutId}`, {
      headers: {
        'If-Match': 'stale-version-token',
      },
      data: {
        name: 'This Should Fail',
      },
    });

    expect(response.status()).toBe(409); // Conflict
    const body = await response.json();
    expect(body.error).toHaveProperty('code', 'VERSION_CONFLICT');
  });

  test('8. Delete the layout', async ({ request }) => {
    const response = await request.delete(`/api/layouts/${layoutId}`, {
      headers: {
        'If-Match': layoutVersionToken,
      },
    });

    expect(response.status()).toBe(204);
  });

  test('9. Verify layout is deleted', async ({ request }) => {
    const response = await request.get(`/api/layouts/${layoutId}`);
    expect(response.status()).toBe(404);
  });

  test('10. Delete the site', async ({ request }) => {
    const response = await request.delete(`/api/sites/${siteId}`, {
      headers: {
        'If-Match': siteVersionToken,
      },
    });

    expect(response.status()).toBe(204);
  });

  test('11. Verify site is deleted', async ({ request }) => {
    const response = await request.get(`/api/sites/${siteId}`);
    expect(response.status()).toBe(404);
  });
});
