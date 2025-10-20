import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Cursor Pagination
 * Tests cursor-based pagination across multiple pages
 */

test.describe('Cursor Pagination E2E', () => {
  let testClubId: number;
  let createdSiteIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    // Seed test club for E2E
    const seedResponse = await request.post('/api/test/seed');
    expect(seedResponse.status()).toBe(200);
    const seedData = await seedResponse.json();
    testClubId = seedData.clubId;

    // Create 15 sites for pagination testing
    for (let i = 1; i <= 15; i++) {
      const response = await request.post('/api/sites', {
        data: {
          club_id: testClubId,
          name: `Pagination Site ${i.toString().padStart(2, '0')}`,
          address: `${i} Test Ave`,
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'US',
          location: {
            type: 'Point',
            coordinates: [-122.4194 + i * 0.001, 37.7749],
          },
        },
      });
      const siteData = await response.json();
      createdSiteIds.push(siteData.data.id);
    }
  });

  test('1. Fetch first page with limit=5', async ({ request }) => {
    const response = await request.get(`/api/sites?club_id=${testClubId}&limit=5`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveLength(5);
    expect(body).toHaveProperty('has_more', true);
    expect(body).toHaveProperty('next_cursor');
    expect(typeof body.next_cursor).toBe('string');
  });

  test('2. Navigate through all pages', async ({ request }) => {
    let cursor: string | undefined = undefined;
    let pageCount = 0;
    let totalItems = 0;

    while (pageCount < 10) { // Safety limit
      const url = cursor 
        ? `/api/sites?club_id=${testClubId}&limit=5&cursor=${cursor}`
        : `/api/sites?club_id=${testClubId}&limit=5`;
      
      const response = await request.get(url);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);

      totalItems += body.data.length;
      pageCount++;

      if (!body.has_more) {
        break;
      }

      expect(body).toHaveProperty('next_cursor');
      cursor = body.next_cursor;
    }

    // Should have retrieved all 15 sites
    expect(totalItems).toBeGreaterThanOrEqual(15);
    expect(pageCount).toBeGreaterThan(1); // Multiple pages
  });

  test('3. Verify cursor stability', async ({ request }) => {
    // Get first page twice with same parameters
    const response1 = await request.get(`/api/sites?club_id=${testClubId}&limit=5`);
    const body1 = await response1.json();

    const response2 = await request.get(`/api/sites?club_id=${testClubId}&limit=5`);
    const body2 = await response2.json();

    // Should return identical results
    expect(body1.data.length).toBe(body2.data.length);
    expect(body1.next_cursor).toBe(body2.next_cursor);
    expect(body1.data[0].id).toBe(body2.data[0].id);
  });

  test('4. Validate cursor format (Base64)', async ({ request }) => {
    const response = await request.get(`/api/sites?club_id=${testClubId}&limit=5`);
    const body = await response.json();

    if (body.next_cursor) {
      // Cursor should be valid Base64
      const decoded = Buffer.from(body.next_cursor, 'base64').toString('utf-8');
      expect(decoded).toMatch(/^\d+:/); // Format: {id}:{sortValue}
    }
  });

  test('5. Test invalid cursor handling', async ({ request }) => {
    const response = await request.get(`/api/sites?club_id=${testClubId}&cursor=invalid-cursor`);
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('6. Test limit boundary (max 100)', async ({ request }) => {
    const response = await request.get(`/api/sites?club_id=${testClubId}&limit=150`);
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('limit');
  });

  test.afterAll(async ({ request }) => {
    // Clean up: Delete all created sites
    for (const siteId of createdSiteIds) {
      const getResponse = await request.get(`/api/sites/${siteId}`);
      if (getResponse.status() === 200) {
        const siteData = await getResponse.json();
        await request.delete(`/api/sites/${siteId}`, {
          headers: {
            'If-Match': siteData.data.version_token,
          },
        });
      }
    }
  });
});
