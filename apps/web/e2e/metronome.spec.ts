import { test, expect } from '@playwright/test';

test.describe('Metronome Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login as dev user first (async storage state isn't configured, so we go to home)
    await page.goto('/');
  });

  test('navigates to metronome settings page', async ({ page }) => {
    await page.goto('/settings/metronome');
    await expect(page.locator('h1')).toContainText('Метроном');
  });

  test('displays mode selector with 3 options', async ({ page }) => {
    await page.goto('/settings/metronome');
    const modeSelect = page.locator('select').first();
    await expect(modeSelect).toBeVisible();
    const options = await modeSelect.locator('option').allTextContents();
    expect(options).toContain('Везде');
    expect(options).toContain('Только затакт');
    expect(options).toContain('Только такты');
  });

  test('displays 3 beat sections (strong, strong2, weak)', async ({ page }) => {
    await page.goto('/settings/metronome');
    const fieldsets = page.locator('fieldset');
    await expect(fieldsets).toHaveCount(3);

    const legends = await fieldsets.locator('legend').allTextContents();
    expect(legends.some((t) => t.includes('Сильная'))).toBe(true);
    expect(legends.some((t) => t.includes('Вторая'))).toBe(true);
    expect(legends.some((t) => t.includes('Слабая'))).toBe(true);
  });

  test('master volume slider is visible', async ({ page }) => {
    await page.goto('/settings/metronome');
    const sliders = page.locator('input[type="range"]');
    await expect(sliders.first()).toBeVisible();
  });

  test('changing mode updates the select value', async ({ page }) => {
    await page.goto('/settings/metronome');
    const modeSelect = page.locator('select').first();
    await modeSelect.selectOption('pickup-only');
    await expect(modeSelect).toHaveValue('pickup-only');
  });
});
