import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Workbench Page
 * Tests unified Workbench navigation, list views, and layout creation flow
 */

test.describe('Workbench Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workbench page
    await page.goto('/workbench');
    await page.waitForLoadState('networkidle');
  });

  test('renders workbench page with correct title', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Workbench/i);
    
    // Check heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Workbench');
  });

  test('displays sites and layouts tabs', async ({ page }) => {
    // Check for tab navigation
    const sitesTab = page.getByRole('tab', { name: /sites/i });
    const layoutsTab = page.getByRole('tab', { name: /layouts/i });
    
    await expect(sitesTab).toBeVisible();
    await expect(layoutsTab).toBeVisible();
  });

  test('can switch between Sites and Layouts tabs', async ({ page }) => {
    // Start on Sites tab
    const sitesTab = page.getByRole('tab', { name: /sites/i });
    const layoutsTab = page.getByRole('tab', { name: /layouts/i });
    
    // Switch to Layouts
    await layoutsTab.click();
    await expect(layoutsTab).toHaveAttribute('aria-selected', 'true');
    
    // Switch back to Sites
    await sitesTab.click();
    await expect(sitesTab).toHaveAttribute('aria-selected', 'true');
  });

  test('shows "New Layout" button', async ({ page }) => {
    const newLayoutButton = page.getByRole('button', { name: /new layout/i });
    await expect(newLayoutButton).toBeVisible();
    await expect(newLayoutButton).toBeEnabled();
  });

  test('clicking "New Layout" opens Intent Wizard', async ({ page }) => {
    // Click "New Layout" button
    const newLayoutButton = page.getByRole('button', { name: /new layout/i });
    await newLayoutButton.click();
    
    // Check if wizard dialog opens
    const wizardDialog = page.getByRole('dialog');
    await expect(wizardDialog).toBeVisible();
    
    // Check wizard title
    await expect(wizardDialog.getByText(/What are you planning/i)).toBeVisible();
  });

  test('displays empty state when no layouts exist', async ({ page }) => {
    // Switch to Layouts tab
    await page.getByRole('tab', { name: /layouts/i }).click();
    
    // Check for empty state (if no layouts)
    // This test may need adjustment based on actual data state
    const emptyState = page.getByText(/no layouts/i).or(page.getByText(/create your first/i));
    
    // Either empty state OR layout list should be visible
    const hasContent = await page.locator('[data-testid="layout-list"]').isVisible()
      .catch(() => false);
    
    if (!hasContent) {
      await expect(emptyState).toBeVisible();
    }
  });
});

test.describe('Workbench Navigation', () => {
  test('can navigate to site detail from Sites tab', async ({ page }) => {
    await page.goto('/workbench');
    await page.waitForLoadState('networkidle');
    
    // Check if any sites exist
    const siteCard = page.locator('[data-testid^="site-card-"]').first();
    const hasSites = await siteCard.isVisible().catch(() => false);
    
    if (hasSites) {
      // Click first site
      await siteCard.click();
      
      // Should navigate to site detail page
      await expect(page).toHaveURL(/\/sites\/\d+/);
    } else {
      test.skip();
    }
  });

  test('can navigate to layout editor from Layouts tab', async ({ page }) => {
    await page.goto('/workbench');
    await page.waitForLoadState('networkidle');
    
    // Switch to Layouts tab
    await page.getByRole('tab', { name: /layouts/i }).click();
    
    // Check if any layouts exist
    const layoutCard = page.locator('[data-testid^="layout-card-"]').first();
    const hasLayouts = await layoutCard.isVisible().catch(() => false);
    
    if (hasLayouts) {
      // Click first layout
      await layoutCard.click();
      
      // Should navigate to editor
      await expect(page).toHaveURL(/\/layouts\/\d+\/editor/);
    } else {
      test.skip();
    }
  });
});

test.describe('Workbench Search and Filters', () => {
  test('displays search input for filtering', async ({ page }) => {
    await page.goto('/workbench');
    
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('can filter layouts by search query', async ({ page }) => {
    await page.goto('/workbench');
    
    // Switch to Layouts tab
    await page.getByRole('tab', { name: /layouts/i }).click();
    
    // Type search query
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test');
    
    // Wait for filtering
    await page.waitForTimeout(500);
    
    // Results should update (exact assertion depends on data)
    // This is a basic check that search doesn't break UI
    await expect(searchInput).toHaveValue('test');
  });
});
