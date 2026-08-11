import { test, expect } from '@playwright/test';

test.describe('GENZ smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /GENZ/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Log in to your account/i)).toBeVisible({ timeout: 15_000 });
  });

  test('register page renders', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('button', { name: /register/i })).toBeVisible({ timeout: 15_000 });
  });

  test('unauthenticated chat redirects to login when auth required', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/login');
  });
});
