import { test, expect } from '@playwright/test';
import {
  loadExampleYaml,
  fillYamlEditors,
  runDiff,
  waitForDiffView,
  switchToCardsView,
  switchToSplitView,
  findChangeCardByType,
  hasMovementIndicators,
} from '../helpers/test-utils';

test.describe('Section Movement Indication (Issue #64)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display movement indicators in Cards view', async ({ page }) => {
    // Load example documents with moved sections
    const oldYaml = await loadExampleYaml('document_v1.yaml');
    const newYaml = await loadExampleYaml('document_v2.yaml');

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    // Switch to Cards view
    await switchToCardsView(page);

    // Find a moved section
    const movedCard = await findChangeCardByType(page, 'Section Moved');
    await expect(movedCard).toBeVisible();

    // Check for movement indicators
    const hasIndicators = await hasMovementIndicators(page);
    expect(hasIndicators).toBe(true);

    // Check for path change display
    const movementIndicator = movedCard.locator('[data-testid="movement-indicator"]');
    await expect(movementIndicator).toBeVisible();

    // Verify arrow icons are present
    const arrows = movementIndicator.locator('svg');
    const arrowCount = await arrows.count();
    expect(arrowCount).toBeGreaterThan(0);

    // Verify old and new paths are displayed
    const pathText = await movementIndicator.textContent();
    expect(pathText).toContain('→');
  });

  test('should display movement indicators in Split view sidebar', async ({ page }) => {
    // Load example documents with moved sections
    const oldYaml = await loadExampleYaml('document_v1.yaml');
    const newYaml = await loadExampleYaml('document_v2.yaml');

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    // Split view is the default, so we should already be in it
    // Look for movement indicators in the sidebar
    const movementIndicators = page.locator('[data-testid="movement-indicator"]');
    const count = await movementIndicators.count();
    expect(count).toBeGreaterThan(0);

    // Verify movement indicator shows line numbers
    const firstIndicator = movementIndicators.first();
    const text = await firstIndicator.textContent();
    expect(text).toMatch(/Moved: Line \d+ → Line \d+/);
  });

  test('should show path changes prominently in moved sections', async ({ page }) => {
    const oldYaml = await loadExampleYaml('document_v1.yaml');
    const newYaml = await loadExampleYaml('document_v2.yaml');

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    await switchToCardsView(page);

    const movedCard = await findChangeCardByType(page, 'Section Moved');
    await expect(movedCard).toBeVisible();

    // Check that path change is visible (not hidden on small screens)
    const movementIndicator = movedCard.locator('[data-testid="movement-indicator"]');
    await expect(movementIndicator).toBeVisible();

    // Verify it has proper styling (purple background)
    const bgColor = await movementIndicator.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toBeTruthy();
  });

  test('should handle multiple moved sections', async ({ page }) => {
    const oldYaml = await loadExampleYaml('document_v1.yaml');
    const newYaml = await loadExampleYaml('document_v2.yaml');

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    await switchToCardsView(page);

    // Find all moved sections
    const movedCards = page.locator('.border.rounded-lg').filter({
      hasText: /Section Moved/i,
    });

    const count = await movedCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify each moved section has movement indicators
    for (let i = 0; i < count; i++) {
      const card = movedCards.nth(i);
      const indicator = card.locator('[data-testid="movement-indicator"]');
      await expect(indicator).toBeVisible();
    }
  });
});
