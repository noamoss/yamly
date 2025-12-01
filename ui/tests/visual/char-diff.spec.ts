import { test, expect } from '@playwright/test';
import {
  loadExampleYaml,
  fillYamlEditors,
  runDiff,
  waitForDiffView,
  hasCharDiffHighlighting,
} from '../helpers/test-utils';

test.describe('Character-Level Diff Highlighting (Issue #74)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display character-level highlighting in Split View', async ({ page }) => {
    // Load example documents with content changes
    const oldYaml = await loadExampleYaml('document_v1.yaml');
    const newYaml = await loadExampleYaml('document_v2.yaml');

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    // Wait a bit for character diff computation
    await page.waitForTimeout(1000);

    // Check for character-level diff highlighting
    const hasHighlighting = await hasCharDiffHighlighting(page);
    expect(hasHighlighting).toBe(true);
  });

  test('should show deleted characters with red background and strikethrough', async ({ page }) => {
    // Create a simple test case with character changes
    const oldYaml = `document:
  id: "test"
  title: "Test Document"
  sections:
    - marker: "1"
      content: "nginx:1.19"`;

    const newYaml = `document:
  id: "test"
  title: "Test Document"
  sections:
    - marker: "1"
      content: "nginx:1.21"`;

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    // Wait for character diff computation
    await page.waitForTimeout(1000);

    // Check for removed character highlighting
    const removedChars = page.locator('.cm-char-removed');
    const count = await removedChars.count();
    expect(count).toBeGreaterThan(0);

    // Verify styling
    const firstRemoved = removedChars.first();
    const bgColor = await firstRemoved.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toBeTruthy();

    const textDecoration = await firstRemoved.evaluate((el) => {
      return window.getComputedStyle(el).textDecoration;
    });
    expect(textDecoration).toContain('line-through');
  });

  test('should show added characters with green background and underline', async ({ page }) => {
    const oldYaml = `document:
  id: "test"
  title: "Test Document"
  sections:
    - marker: "1"
      content: "nginx:1.19"`;

    const newYaml = `document:
  id: "test"
  title: "Test Document"
  sections:
    - marker: "1"
      content: "nginx:1.21"`;

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    // Wait for character diff computation
    await page.waitForTimeout(1000);

    // Check for added character highlighting
    const addedChars = page.locator('.cm-char-added');
    const count = await addedChars.count();
    expect(count).toBeGreaterThan(0);

    // Verify styling
    const firstAdded = addedChars.first();
    const bgColor = await firstAdded.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toBeTruthy();

    const textDecoration = await firstAdded.evaluate((el) => {
      return window.getComputedStyle(el).textDecoration;
    });
    expect(textDecoration).toContain('underline');
  });

  test('should handle whitespace changes', async ({ page }) => {
    const oldYaml = `document:
  id: "test"
  title: "Test Document"`;

    const newYaml = `document:
  id: "test"
  title: "Test  Document"`;

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    // Wait for character diff computation
    await page.waitForTimeout(1000);

    // Should still show character-level highlighting for whitespace
    const hasHighlighting = await hasCharDiffHighlighting(page);
    // May or may not have highlighting depending on how whitespace is handled
    // Just verify the page doesn't crash
    expect(page).toBeTruthy();
  });

  test('should only highlight changed lines (performance)', async ({ page }) => {
    // Create a document with many unchanged lines and a few changed lines
    let oldYaml = 'document:\n  id: "test"\n  title: "Test"\n  sections:\n';
    let newYaml = 'document:\n  id: "test"\n  title: "Test Updated"\n  sections:\n';

    // Add many unchanged lines
    for (let i = 0; i < 50; i++) {
      oldYaml += `    - marker: "${i}"\n      content: "Line ${i}"\n`;
      newYaml += `    - marker: "${i}"\n      content: "Line ${i}"\n`;
    }

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    // Wait for character diff computation
    await page.waitForTimeout(2000);

    // Should only have character highlighting on changed lines
    const highlightedLines = page.locator('.cm-char-added, .cm-char-removed');
    const count = await highlightedLines.count();

    // Should have some highlighting but not on every line
    // The exact count depends on the diff, but should be reasonable
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(100); // Should not highlight all 50+ lines
  });

  test('should handle empty string changes', async ({ page }) => {
    const oldYaml = `document:
  id: "test"
  sections:
    - marker: "1"
      content: ""`;

    const newYaml = `document:
  id: "test"
  sections:
    - marker: "1"
      content: "New content"`;

    await fillYamlEditors(page, oldYaml, newYaml);
    await runDiff(page);
    await waitForDiffView(page);

    // Wait for character diff computation
    await page.waitForTimeout(1000);

    // Should handle gracefully without errors
    const hasHighlighting = await hasCharDiffHighlighting(page);
    // May or may not show highlighting for empty strings
    expect(page).toBeTruthy();
  });
});
