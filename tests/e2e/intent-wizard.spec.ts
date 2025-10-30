import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Intent Wizard
 * Tests 3-step wizard flow for creating layouts with intent selection
 */

test.describe('Intent Wizard - Step 1: Intent Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workbench');
    await page.waitForLoadState('networkidle');
    
    // Open wizard
    await page.getByRole('button', { name: /new layout/i }).click();
    
    // Wait for wizard dialog
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('displays wizard with step 1 title', async ({ page }) => {
    const wizardTitle = page.getByText(/What are you planning/i);
    await expect(wizardTitle).toBeVisible();
  });

  test('shows intent category buttons', async ({ page }) => {
    // Check for main intent categories
    const categories = [
      /sports tournament/i,
      /sports training/i,
      /event/i,
      /construction/i,
      /emergency/i,
      /film/i,
    ];
    
    for (const category of categories) {
      const button = page.getByRole('button', { name: category });
      await expect(button).toBeVisible();
    }
  });

  test('can select intent category', async ({ page }) => {
    // Click "Sports Tournament" intent
    const sportsButton = page.getByRole('button', { name: /sports tournament/i });
    await sportsButton.click();
    
    // Button should be selected (check for active styling)
    await expect(sportsButton).toHaveClass(/selected|active|bg-primary/);
  });

  test('Next button is disabled when no intent selected', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeDisabled();
  });

  test('Next button is enabled after selecting intent', async ({ page }) => {
    // Select an intent
    await page.getByRole('button', { name: /sports tournament/i }).click();
    
    // Next button should be enabled
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeEnabled();
  });

  test('can proceed to Step 2 after selecting intent', async ({ page }) => {
    // Select intent
    await page.getByRole('button', { name: /sports tournament/i }).click();
    
    // Click Next
    await page.getByRole('button', { name: /next/i }).click();
    
    // Should show Step 2 title
    await expect(page.getByText(/Choose a template/i)).toBeVisible();
  });
});

test.describe('Intent Wizard - Step 2: Template Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workbench');
    await page.waitForLoadState('networkidle');
    
    // Open wizard and navigate to Step 2
    await page.getByRole('button', { name: /new layout/i }).click();
    await page.getByRole('button', { name: /sports tournament/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    
    // Wait for template list
    await page.waitForTimeout(300);
  });

  test('displays template selection screen', async ({ page }) => {
    const stepTitle = page.getByText(/Choose a template/i);
    await expect(stepTitle).toBeVisible();
  });

  test('shows filtered templates based on selected intent', async ({ page }) => {
    // Should show sport templates for "sports tournament" intent
    const templateCards = page.locator('[data-testid^="template-card-"]');
    
    // Should have at least one template
    await expect(templateCards.first()).toBeVisible();
  });

  test('can select a template', async ({ page }) => {
    // Click first template
    const firstTemplate = page.locator('[data-testid^="template-card-"]').first();
    await firstTemplate.click();
    
    // Template should show selected state
    await expect(firstTemplate).toHaveClass(/selected|border-primary/);
  });

  test('can go back to Step 1', async ({ page }) => {
    // Click Back button
    await page.getByRole('button', { name: /back/i }).click();
    
    // Should return to Step 1
    await expect(page.getByText(/What are you planning/i)).toBeVisible();
  });

  test('Next button is disabled when no template selected', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeDisabled();
  });

  test('Next button is enabled after selecting template', async ({ page }) => {
    // Select first template
    await page.locator('[data-testid^="template-card-"]').first().click();
    
    // Next button should be enabled
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeEnabled();
  });

  test('can proceed to Step 3 after selecting template', async ({ page }) => {
    // Select template
    await page.locator('[data-testid^="template-card-"]').first().click();
    
    // Click Next
    await page.getByRole('button', { name: /next/i }).click();
    
    // Should show Step 3 title
    await expect(page.getByText(/Layout details/i)).toBeVisible();
  });
});

test.describe('Intent Wizard - Step 3: Layout Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workbench');
    await page.waitForLoadState('networkidle');
    
    // Navigate through wizard to Step 3
    await page.getByRole('button', { name: /new layout/i }).click();
    await page.getByRole('button', { name: /sports tournament/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid^="template-card-"]').first().click();
    await page.getByRole('button', { name: /next/i }).click();
    
    // Wait for form
    await page.waitForTimeout(300);
  });

  test('displays layout details form', async ({ page }) => {
    const stepTitle = page.getByText(/Layout details/i);
    await expect(stepTitle).toBeVisible();
  });

  test('shows required form fields', async ({ page }) => {
    // Check for name input
    const nameInput = page.getByLabel(/layout name/i);
    await expect(nameInput).toBeVisible();
    
    // Check for site selection
    const siteSelect = page.getByLabel(/site/i);
    await expect(siteSelect).toBeVisible();
  });

  test('can go back to Step 2', async ({ page }) => {
    // Click Back button
    await page.getByRole('button', { name: /back/i }).click();
    
    // Should return to Step 2
    await expect(page.getByText(/Choose a template/i)).toBeVisible();
  });

  test('Create button is disabled with empty form', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create layout/i });
    await expect(createButton).toBeDisabled();
  });

  test('can fill in layout details', async ({ page }) => {
    // Fill layout name
    const nameInput = page.getByLabel(/layout name/i);
    await nameInput.fill('Test Layout E2E');
    
    // Select site (if dropdown populated)
    const siteSelect = page.getByLabel(/site/i);
    await siteSelect.click();
    
    // Select first option (if available)
    const firstOption = page.getByRole('option').first();
    const hasOptions = await firstOption.isVisible().catch(() => false);
    
    if (hasOptions) {
      await firstOption.click();
    }
  });

  test('Create button is enabled after filling required fields', async ({ page }) => {
    // Fill required fields
    await page.getByLabel(/layout name/i).fill('Test Layout E2E');
    
    // Select site
    await page.getByLabel(/site/i).click();
    const firstOption = page.getByRole('option').first();
    const hasOptions = await firstOption.isVisible().catch(() => false);
    
    if (hasOptions) {
      await firstOption.click();
      
      // Create button should be enabled
      const createButton = page.getByRole('button', { name: /create layout/i });
      await expect(createButton).toBeEnabled();
    } else {
      test.skip();
    }
  });
});

test.describe('Intent Wizard - Complete Flow', () => {
  test('can complete full wizard flow and create layout', async ({ page }) => {
    await page.goto('/workbench');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Select intent
    await page.getByRole('button', { name: /new layout/i }).click();
    await page.getByRole('button', { name: /sports tournament/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    
    // Step 2: Select template
    await page.waitForTimeout(300);
    await page.locator('[data-testid^="template-card-"]').first().click();
    await page.getByRole('button', { name: /next/i }).click();
    
    // Step 3: Fill details
    await page.waitForTimeout(300);
    await page.getByLabel(/layout name/i).fill(`E2E Test Layout ${Date.now()}`);
    
    // Select site
    await page.getByLabel(/site/i).click();
    const firstOption = page.getByRole('option').first();
    const hasOptions = await firstOption.isVisible().catch(() => false);
    
    if (!hasOptions) {
      test.skip();
      return;
    }
    
    await firstOption.click();
    
    // Create layout
    const createButton = page.getByRole('button', { name: /create layout/i });
    await createButton.click();
    
    // Should navigate to editor
    await page.waitForURL(/\/layouts\/\d+\/editor/, { timeout: 10000 });
    
    // Verify editor loaded
    await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible({ timeout: 10000 });
  });

  test('can cancel wizard at any step', async ({ page }) => {
    await page.goto('/workbench');
    
    // Open wizard
    await page.getByRole('button', { name: /new layout/i }).click();
    
    // Cancel from Step 1
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();
    
    // Wizard should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
    
    // Should still be on workbench
    await expect(page).toHaveURL(/\/workbench/);
  });

  test.skip('wizard closes after successful layout creation', async ({ page }) => {
    // This test verifies the wizard dialog doesn't stay open
    // after navigating to editor (covered in complete flow test above)
  });
});

test.describe('Intent Wizard - Edge Cases', () => {
  test.skip('handles missing site gracefully', async ({ page }) => {
    // Test what happens when no sites exist
    // This would require API mocking or test data setup
  });

  test('preserves selection when navigating back', async ({ page }) => {
    await page.goto('/workbench');
    
    // Navigate to Step 2
    await page.getByRole('button', { name: /new layout/i }).click();
    await page.getByRole('button', { name: /sports tournament/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    
    // Select template
    await page.waitForTimeout(300);
    await page.locator('[data-testid^="template-card-"]').first().click();
    
    // Go back
    await page.getByRole('button', { name: /back/i }).click();
    
    // Intent should still be selected
    const sportsButton = page.getByRole('button', { name: /sports tournament/i });
    await expect(sportsButton).toHaveClass(/selected|active|bg-primary/);
  });
});
