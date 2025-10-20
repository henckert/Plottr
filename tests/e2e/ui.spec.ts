import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Frontend UI Smoke Tests
 * Validates frontend is running and accessible
 */

test.describe('Frontend UI Smoke Tests', () => {
  test.use({
    baseURL: 'http://localhost:3000',
  });

  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page loaded
    await expect(page).toHaveTitle(/Plottr/);
    
    // Check header is present
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Check main content
    const heading = page.locator('h2').first();
    await expect(heading).toContainText('Welcome to Plottr');
  });

  test('health check page works', async ({ page }) => {
    await page.goto('/health');
    
    // Check status message
    await expect(page.locator('text=UI OK')).toBeVisible();
  });

  test('test page displays configuration', async ({ page }) => {
    await page.goto('/test');
    
    await expect(page.getByRole('heading', { level: 1, name: 'Test Page' })).toBeVisible();
    await expect(page.locator('text=Frontend is working')).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation links
    const layoutsLink = page.locator('a[href="/app/layouts"]');
    await expect(layoutsLink).toBeVisible();
    
    const templatesLink = page.locator('a[href="/app/templates"]');
    await expect(templatesLink).toBeVisible();
  });

  test('responsive header on mobile', async ({ page, viewport }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});
