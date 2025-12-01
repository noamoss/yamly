import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load an example YAML file from the public/examples directory
 */
export async function loadExampleYaml(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'examples', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Wait for the diff view to be ready
 */
export async function waitForDiffView(page: Page) {
  // Wait for the diff view to appear
  await page.waitForSelector('[data-testid="split-diff-view"], [data-testid="diff-view"], .diff-view, .split-diff-view', {
    timeout: 10000,
  });
}

/**
 * Fill the YAML editors with content
 */
export async function fillYamlEditors(
  page: Page,
  oldYaml: string,
  newYaml: string
) {
  // Wait for editors to be ready
  await page.waitForSelector('.cm-content, textarea', { timeout: 5000 });

  // Find the old YAML editor (first editor on the left)
  const oldEditor = page.locator('.cm-content, textarea').first();
  await oldEditor.click();
  await oldEditor.fill(oldYaml);

  // Find the new YAML editor (second editor on the right)
  const newEditor = page.locator('.cm-content, textarea').nth(1);
  await newEditor.click();
  await newEditor.fill(newYaml);
}

/**
 * Click the "Run Diff" button and wait for results
 */
export async function runDiff(page: Page) {
  await page.click('button:has-text("Run Diff")');

  // Wait for the diff to complete (either diff view appears or error message)
  await Promise.race([
    page.waitForSelector('[data-testid="diff-view"], .diff-view, .split-diff-view', {
      timeout: 10000,
    }),
    page.waitForSelector('.bg-red-50, .error', { timeout: 10000 }),
  ]);
}

/**
 * Switch to split view
 */
export async function switchToSplitView(page: Page) {
  // Click the "Split" or "Split View" button if it exists
  const splitButton = page.locator('button:has-text("Split"), button[aria-label*="split" i]');
  if (await splitButton.count() > 0) {
    await splitButton.click();
  }
}

/**
 * Switch to cards view
 */
export async function switchToCardsView(page: Page) {
  // Click the "Cards" or "Cards View" button if it exists
  const cardsButton = page.locator('button:has-text("Cards"), button[aria-label*="card" i]');
  if (await cardsButton.count() > 0) {
    await cardsButton.click();
  }
}

/**
 * Get all change cards from the cards view
 */
export async function getChangeCards(page: Page) {
  return page.locator('[data-testid="change-card"]').filter({
    hasText: /Section (Added|Removed|Moved|Changed)|Value Changed|Key (Added|Removed)/i,
  });
}

/**
 * Find a change card by change type
 */
export async function findChangeCardByType(
  page: Page,
  changeType: string
) {
  return page.locator('[data-testid="change-card"]').filter({
    hasText: new RegExp(changeType, 'i'),
  }).first();
}

/**
 * Check if character-level diff highlighting is present
 */
export async function hasCharDiffHighlighting(page: Page): Promise<boolean> {
  // Look for spans with character-level diff classes
  const charDiffElements = page.locator(
    '.bg-red-200.line-through, .bg-green-200, .char-added, .char-removed'
  );
  return (await charDiffElements.count()) > 0;
}

/**
 * Check if section movement indicators are visible
 */
export async function hasMovementIndicators(page: Page): Promise<boolean> {
  // Look for movement indicators (arrows, path changes, etc.)
  const movementIndicators = page.locator(
    '[data-testid="movement-indicator"], .movement-indicator, .section-moved-indicator, svg[class*="arrow"]'
  );
  return (await movementIndicators.count()) > 0;
}

/**
 * Take a screenshot with a consistent name
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean }
) {
  await page.screenshot({
    path: `tests/screenshots/${name}.png`,
    fullPage: options?.fullPage ?? false,
  });
}
